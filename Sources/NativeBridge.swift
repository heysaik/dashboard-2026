import AppKit
import Contacts
import CoreServices
import ServiceManagement
import UniformTypeIdentifiers
import WebKit

@MainActor final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
    unowned let app: AppDelegate
    let store: LocalStore
    let generator = WidgetGenerator()
    var loaded = false
    let network = NetworkService()
    init(app: AppDelegate) throws { self.app = app; self.store = try LocalStore(); super.init() }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "dashboard", message.frameInfo.request.url?.host == "app", let body = message.body as? [String: Any], let action = body["action"] as? String else { replyHandler(nil, "Untrusted request"); return }
        let data = body["data"] as? [String: Any] ?? [:]
        Task {
            do { replyHandler(try await handle(action, data), nil) }
            catch { replyHandler(nil, error.localizedDescription) }
        }
    }
    func handle(_ action: String, _ data: [String: Any]) async throws -> Any {
        switch action {
        case "load": return try store.read()
        case "environment": return app.environment()
        case "symbols": return DashboardSymbols.images
        case "materials": app.materials.update(data); return true
        case "save": try store.write(data); return true
        case "fetch": return try await network.fetch(data["url"] as? String ?? "")
        case "dismiss": app.dismiss(); return true
        case "space": app.setSpace(); return true
        case "overlay": app.setOverlay(); return true
        case "spaceHelp": app.spaceHelp(); return true
        case "pinSpace": return await app.pinning.pin()
        case "appearance": app.setAppearance(data["texture"] as? String ?? "leopard"); return true
        case "open":
            guard let url = URL(string: data["url"] as? String ?? ""), ["https", "http", "dict", "music"].contains(url.scheme ?? "") else { throw DashboardError.message("This link cannot be opened.") }
            NSWorkspace.shared.open(url); return true
        case "dictionaries": return DSDictionarySources()
        case "dictionary":
            let word = String((data["word"] as? String ?? "").prefix(120))
            return DSDefinition(word, data["source"] as? String ?? "")
        case "contacts": return try await contacts(data["query"] as? String ?? "")
        case "music": return try music(data["command"] as? String ?? "status", volume: data["volume"] as? Int, playlist: data["playlist"] as? String)
        case "musicPlaylists": return try musicPlaylists()
        case "providers": return await generator.providers(endpoint: data["endpoint"] as? String ?? "http://127.0.0.1:1234/v1")
        case "generate", "translate":
            let raw = try await generator.generate(prompt: data["prompt"] as? String ?? "", provider: data["provider"] as? String ?? "codex", endpoint: data["endpoint"] as? String ?? "http://127.0.0.1:1234/v1", model: data["model"] as? String ?? "", widget: action == "generate", theme: data["theme"] as? String ?? "leopard")
            if action == "translate" { return raw }
            return try JSONSerialization.jsonObject(with: JSONEncoder().encode(WidgetManifest.parse(raw)))
        case "cancel": generator.cancel(); return true
        case "import": await importWidget(); return true
        case "export":
            let widget = try JSONDecoder().decode(WidgetManifest.self, from: JSONSerialization.data(withJSONObject: data)); try widget.validate()
            let panel = NSSavePanel(); panel.allowedContentTypes = [UTType(filenameExtension: "dashboardwidget") ?? .json]; panel.nameFieldStringValue = widget.name + ".dashboardwidget"
            guard await panel.beginSheetModal(for: app.window) == .OK, let url = panel.url else { return false }
            try JSONEncoder().encode(widget).write(to: url, options: .atomic); return true
        case "loginStatus": return SMAppService.mainApp.status == .enabled
        case "login":
            if data["enabled"] as? Bool == true { try SMAppService.mainApp.register() } else { try await SMAppService.mainApp.unregister() }
            return SMAppService.mainApp.status == .enabled
        case "revealData": NSWorkspace.shared.open(store.directory); return true
        default: throw DashboardError.message("Unknown Dashboard action.")
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; consumeImports(); app.publishEnvironment() }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.targetFrame?.isMainFrame == false { decisionHandler(.allow); return }
        if navigationAction.request.url?.scheme == "dashboard" { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }
    func consumeImports() {
        guard loaded else { return }
        for url in app.pendingImports { Task { await importURL(url) } }; app.pendingImports.removeAll()
    }
    func importWidget() async {
        let panel = NSOpenPanel(); panel.allowedContentTypes = [UTType(filenameExtension: "dashboardwidget") ?? .json, .json, .html]; panel.allowsMultipleSelection = false
        guard await panel.beginSheetModal(for: app.window) == .OK, let url = panel.url else { return }
        await importURL(url)
    }
    func importURL(_ url: URL) async {
        do {
            let data = try Data(contentsOf: url)
            guard data.count < 1_100_000 else { throw DashboardError.message("Choose a widget smaller than 1 MB.") }
            let manifest: WidgetManifest
            if url.pathExtension.lowercased() == "html" { manifest = WidgetManifest(version: 1, name: url.deletingPathExtension().lastPathComponent, width: 320, height: 260, html: String(decoding: data, as: UTF8.self)) }
            else { manifest = try JSONDecoder().decode(WidgetManifest.self, from: data) }
            try manifest.validate()
            let json = String(data: try JSONEncoder().encode(manifest), encoding: .utf8)!
            app.showDashboard()
            try await app.webView.evaluateJavaScript("Dashboard.previewImport(\(json))")
        } catch { await NSAlert(error: error).beginSheetModal(for: app.window) }
    }
    func contacts(_ query: String) async throws -> [[String: String]] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
        let contacts = CNContactStore()
        guard try await contacts.requestAccess(for: .contacts) else { throw DashboardError.message("Allow Contacts access in System Settings → Privacy & Security → Contacts.") }
        let keys = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactEmailAddressesKey, CNContactPhoneNumbersKey].map { $0 as CNKeyDescriptor }
        return try contacts.unifiedContacts(matching: CNContact.predicateForContacts(matchingName: String(query.prefix(100))), keysToFetch: keys).prefix(15).map { contact in ["name": "\(contact.givenName) \(contact.familyName)", "email": contact.emailAddresses.first?.value as String? ?? "", "phone": contact.phoneNumbers.first?.value.stringValue ?? ""] }
    }
    func music(_ command: String, volume: Int? = nil, playlist: String? = nil) throws -> [String: String] {
        let commands = ["playpause": "playpause", "next": "next track", "previous": "previous track", "status": ""]
        let action: String
        if command == "volume", let volume, (0...100).contains(volume) { action = "set sound volume to \(volume)" }
        else if command == "playlist", let playlist, playlist.range(of: "^[A-Fa-f0-9]{16}$", options: .regularExpression) != nil {
            action = "play (first user playlist whose persistent ID is \"\(playlist)\")"
        } else if let control = commands[command] { action = control }
        else { throw DashboardError.message("Unknown playback control.") }
        let source = """
        tell application "Music"
            \(action)
            if player state is stopped then return {"Stopped", "Choose a song", "", sound volume as string}
            return {player state as string, name of current track, artist of current track, sound volume as string}
        end tell
        """
        let result = try executeMusic(source)
        return ["state": result.atIndex(1)?.stringValue ?? "Stopped", "title": result.atIndex(2)?.stringValue ?? "Music", "artist": result.atIndex(3)?.stringValue ?? "", "volume": result.atIndex(4)?.stringValue ?? "50"]
    }
    func musicPlaylists() throws -> [[String: String]] {
        let result = try executeMusic("""
        tell application "Music"
            set choices to {}
            repeat with itemPlaylist in user playlists
                if class of itemPlaylist is not folder playlist then
                    set end of choices to {persistent ID of itemPlaylist, name of itemPlaylist}
                end if
            end repeat
            return choices
        end tell
        """)
        guard result.numberOfItems > 0 else { return [] }
        return (1...result.numberOfItems).compactMap { index in
            guard let item = result.atIndex(index), let id = item.atIndex(1)?.stringValue, let name = item.atIndex(2)?.stringValue else { return nil }
            return ["id": id, "name": name]
        }
    }
    private func executeMusic(_ source: String) throws -> NSAppleEventDescriptor {
        var error: NSDictionary?
        let result = NSAppleScript(source: source)?.executeAndReturnError(&error)
        if let error {
            if error[NSAppleScript.errorNumber] as? Int == -1743 { throw DashboardError.message("Allow Dashboard to control Music in System Settings → Privacy & Security → Automation, then try again.") }
            throw DashboardError.message("Music could not complete that action. Open Music, check the playlist or track, and try again.")
        }
        guard let result else { throw DashboardError.message("Music did not respond. Try again.") }
        return result
    }
}

final class NetworkService: NSObject, URLSessionTaskDelegate {
    static let hosts: Set<String> = ["api.open-meteo.com", "geocoding-api.open-meteo.com", "api.frankfurter.dev", "api.frankfurter.app", "query1.finance.yahoo.com", "query2.finance.yahoo.com", "stooq.com", "site.api.espn.com", "itunes.apple.com"]
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.ephemeral; config.timeoutIntervalForRequest = 20
        config.httpAdditionalHeaders = ["User-Agent": "Dashboard2026/0.1 (macOS)"]
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()
    func fetch(_ string: String) async throws -> Any {
        guard let url = URL(string: string), url.scheme == "https", Self.hosts.contains(url.host ?? ""), url.user == nil, url.password == nil else { throw DashboardError.message("This data source is not supported.") }
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw DashboardError.message("Data source unavailable (HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0)). Try again later.") }
        guard data.count < 5_000_000 else { throw DashboardError.message("Data response is too large.") }
        if let json = try? JSONSerialization.jsonObject(with: data) { return json }
        return String(decoding: data, as: UTF8.self)
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(request.url?.scheme == "https" && Self.hosts.contains(request.url?.host ?? "") ? request : nil)
    }
}
