import AppKit
import Carbon
import ServiceManagement
import WebKit

final class DashboardWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
    override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect {
        if styleMask.contains(.fullScreen) { return frameRect }
        return super.constrainFrameRect(frameRect, to: screen)
    }
}

@MainActor final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    var window: DashboardWindow!
    var webView: WKWebView!
    var bridge: NativeBridge!
    var status: NSStatusItem!
    var hotKey: EventHotKeyRef?
    var f12HotKey: EventHotKeyRef?
    var handler: EventHandlerRef?
    var previousApp: NSRunningApplication?
    var overlay = false
    var pendingImports: [URL] = []
    var pinning: SpacePinning!
    var wallpaper: DashboardWallpaper!
    var materials: DashboardMaterials!
    var currentTexture = "leopard"
    var preparingToQuit = false
    var isTest: Bool { ProcessInfo.processInfo.arguments.contains("--smoke-test") }

    func applicationDidFinishLaunching(_ notification: Notification) {
        _ = DSAllowFullDisplayContent()
        do { bridge = try NativeBridge(app: self) }
        catch { NSAlert(error: error).runModal(); NSApp.terminate(nil); return }
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(ResourceHandler(), forURLScheme: "dashboard")
        configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "native")
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = bridge
        webView.setValue(false, forKey: "drawsBackground")
        #if DEBUG
        webView.isInspectable = true
        #endif
        let screen = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        window = DashboardWindow(contentRect: screen, styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        window.title = "Dashboard"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.isReleasedWhenClosed = false
        window.minSize = NSSize(width: 800, height: 600)
        window.collectionBehavior = [.fullScreenPrimary]
        window.backgroundColor = NSColor(calibratedWhite: 0.20, alpha: 1)
        let container = NSView(frame: NSRect(origin: .zero, size: screen.size))
        wallpaper = DashboardWallpaper(frame: container.bounds)
        wallpaper.imageScaling = .scaleAxesIndependently
        wallpaper.autoresizingMask = [.width, .height]
        container.addSubview(wallpaper)
        materials = DashboardMaterials(frame: container.bounds)
        materials.autoresizingMask = [.width, .height]
        container.addSubview(materials)
        webView.frame = container.bounds
        webView.autoresizingMask = [.width, .height]
        container.addSubview(webView)
        window.contentView = container
        window.delegate = self
        NotificationCenter.default.addObserver(self, selector: #selector(displayEnvironmentChanged), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        NSWorkspace.shared.notificationCenter.addObserver(self, selector: #selector(displayEnvironmentChanged), name: NSWorkspace.accessibilityDisplayOptionsDidChangeNotification, object: nil)
        pinning = SpacePinning(app: self)
        setAppearance("leopard")
        buildMenus()
        registerShortcut()
        if ProcessInfo.processInfo.arguments.contains("--enable-login") && !isTest {
            do { try SMAppService.mainApp.register() }
            catch { NSLog("Dashboard login registration: %@", error.localizedDescription) }
        }
        previousApp = NSWorkspace.shared.frontmostApplication
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        webView.load(URLRequest(url: URL(string: "dashboard://app/index.html")!))
        if isTest {
            runSmokeTest()
        } else if !ProcessInfo.processInfo.arguments.contains("--windowed") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                if UserDefaults.standard.string(forKey: "displayMode") == "overlay" { self.setOverlay() }
                else { self.setSpace() }
            }
        }
    }

    func buildMenus() {
        let main = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu(title: "Dashboard")
        appMenu.addItem(withTitle: "About Dashboard", action: #selector(about), keyEquivalent: "")
        appMenu.addItem(withTitle: "Settings…", action: #selector(settings), keyEquivalent: ",")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Dashboard", action: #selector(dismiss), keyEquivalent: "h")
        appMenu.addItem(withTitle: "Quit Dashboard", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu; main.addItem(appItem)
        let editItem = NSMenuItem(); let edit = NSMenu(title: "Edit")
        for (title, action, key) in [("Undo", Selector(("undo:")), "z"), ("Cut", #selector(NSText.cut(_:)), "x"), ("Copy", #selector(NSText.copy(_:)), "c"), ("Paste", #selector(NSText.paste(_:)), "v"), ("Select All", #selector(NSText.selectAll(_:)), "a")] { edit.addItem(withTitle: title, action: action, keyEquivalent: key) }
        editItem.submenu = edit; main.addItem(editItem)
        let viewItem = NSMenuItem(); let view = dashboardMenu()
        view.title = "Dashboard"; viewItem.submenu = view; main.addItem(viewItem)
        NSApp.mainMenu = main
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status.button?.image = NSImage(systemSymbolName: "gauge.with.dots.needle.50percent", accessibilityDescription: "Dashboard")
        status.menu = dashboardMenu()
    }

    func dashboardMenu() -> NSMenu {
        let menu = NSMenu(title: "Dashboard")
        for (title, action, key) in [("Show Dashboard    ⌃⌥D", #selector(showDashboard), ""), ("Add Widgets…", #selector(addWidgets), "+"), ("Create a Widget…", #selector(createWidget), "n"), ("Import Widget…", #selector(importWidget), "o")] { let item = menu.addItem(withTitle: title, action: action, keyEquivalent: key); item.target = self }
        menu.addItem(.separator())
        menu.addItem(withTitle: "Use as a Space", action: #selector(setSpace), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Use as an Overlay", action: #selector(setOverlay), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Pin Dashboard to the Left", action: #selector(pinSpace), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Position Dashboard in Spaces…", action: #selector(spaceHelp), keyEquivalent: "").target = self
        menu.addItem(.separator())
        menu.addItem(withTitle: "Settings…", action: #selector(settings), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Quit Dashboard", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "")
        return menu
    }

    func registerShortcut() {
        var type = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, _, context in
            guard let context else { return OSStatus(eventNotHandledErr) }
            let app = Unmanaged<AppDelegate>.fromOpaque(context).takeUnretainedValue()
            DispatchQueue.main.async { app.toggleDashboard() }
            return noErr
        }, 1, &type, Unmanaged.passUnretained(self).toOpaque(), &handler)
        let code = RegisterEventHotKey(UInt32(kVK_ANSI_D), UInt32(controlKey | optionKey), EventHotKeyID(signature: 0x44415348, id: 1), GetApplicationEventTarget(), 0, &hotKey)
        if code != noErr { NSLog("Dashboard shortcut registration failed: %d", code) }
        RegisterEventHotKey(UInt32(kVK_F12), 0, EventHotKeyID(signature: 0x44415348, id: 2), GetApplicationEventTarget(), 0, &f12HotKey)
    }

    func toggleDashboard() { NSApp.isActive && window.isVisible ? dismiss() : showDashboard() }
    @objc func showDashboard() {
        if let front = NSWorkspace.shared.frontmostApplication, front.bundleIdentifier != Bundle.main.bundleIdentifier { previousApp = front }
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        if overlay { window.alphaValue = 0; NSAnimationContext.runAnimationGroup { $0.duration = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 0 : 0.22; window.animator().alphaValue = 1 } }
    }
    @objc func dismiss() {
        if overlay { NSAnimationContext.runAnimationGroup({ $0.duration = 0.18; window.animator().alphaValue = 0 }, completionHandler: { Task { @MainActor in self.window.orderOut(nil); self.window.alphaValue = 1 } }) }
        previousApp?.activate()
    }
    @objc func setSpace() {
        overlay = false
        window.level = .normal
        window.styleMask.insert([.titled, .resizable, .closable, .miniaturizable, .fullSizeContentView])
        window.collectionBehavior = [.fullScreenPrimary]
        window.isOpaque = true
        wallpaper.isHidden = false
        webView.evaluateJavaScript("document.body.classList.remove('overlay-mode')", completionHandler: nil)
        showDashboard()
        if !window.styleMask.contains(.fullScreen) { window.toggleFullScreen(nil) }
        if !isTest { UserDefaults.standard.set("space", forKey: "displayMode") }
    }
    @objc func setOverlay() {
        if window.styleMask.contains(.fullScreen) {
            overlay = true; window.toggleFullScreen(nil); return
        }
        overlay = true
        pinning.stop()
        wallpaper.isHidden = true
        window.styleMask = [.borderless, .resizable]
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        window.level = .floating
        window.isOpaque = false
        window.backgroundColor = .clear
        if let screen = NSScreen.main { window.setFrame(screen.frame, display: true) }
        webView.evaluateJavaScript("document.body.classList.add('overlay-mode')", completionHandler: nil)
        if !isTest { UserDefaults.standard.set("overlay", forKey: "displayMode") }
        showDashboard()
        publishEnvironment()
    }
    func windowDidExitFullScreen(_ notification: Notification) { if overlay { setOverlay() }; publishEnvironment() }
    func windowDidEnterFullScreen(_ notification: Notification) {
        fillScreen()
        Task { @MainActor in _ = await pinning.pin(); fillScreen() }
    }
    func window(_ window: NSWindow, willUseFullScreenContentSize proposedSize: NSSize) -> NSSize { (window.screen ?? NSScreen.main)?.frame.size ?? proposedSize }
    func window(_ window: NSWindow, willUseFullScreenPresentationOptions proposedOptions: NSApplication.PresentationOptions) -> NSApplication.PresentationOptions { [.fullScreen, .autoHideMenuBar, .autoHideDock] }
    func windowDidChangeScreen(_ notification: Notification) { fillScreen(); setAppearance(currentTexture) }
    func windowDidResize(_ notification: Notification) { publishEnvironment() }
    @objc func displayEnvironmentChanged() { fillScreen(); publishEnvironment() }
    func fillScreen() {
        guard window != nil, window.styleMask.contains(.fullScreen), let screen = window.screen ?? NSScreen.main else { return }
        if window.frame != screen.frame { window.setFrame(screen.frame, display: true) }
        publishEnvironment()
    }
    func environment() -> [String: Any] {
        let screen = window.screen ?? NSScreen.main
        let full = window.styleMask.contains(.fullScreen) || overlay
        let left = screen?.auxiliaryTopLeftArea, right = screen?.auxiliaryTopRightArea
        let notchWidth = (left != nil && right != nil) ? max(0, right!.minX - left!.maxX) : 0
        return ["safeTop": full ? screen?.safeAreaInsets.top ?? 0 : 24,
                "notchLeft": full && notchWidth > 0 ? left!.maxX - (screen?.frame.minX ?? 0) : 0,
                "notchWidth": full ? notchWidth : 0,
                "reduceMotion": NSWorkspace.shared.accessibilityDisplayShouldReduceMotion,
                "reduceTransparency": NSWorkspace.shared.accessibilityDisplayShouldReduceTransparency,
                "increaseContrast": NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast,
                "nativeGlass": DashboardMaterials.supportsGlass]
    }
    func publishEnvironment() {
        guard bridge?.loaded == true, let data = try? JSONSerialization.data(withJSONObject: environment()), let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.Dashboard?.setEnvironment(\(json))", completionHandler: nil)
    }
    @objc func pinSpace() {
        if !window.styleMask.contains(.fullScreen) { setSpace(); return }
        Task { @MainActor in
            let result = await pinning.pin()
            let message = result["message"] as? String ?? "Space status unavailable."
            let json = String(data: try! JSONSerialization.data(withJSONObject: [message]), encoding: .utf8)!
            _ = try? await webView.evaluateJavaScript("Dashboard.toast(\(json)[0], 10000)")
        }
    }
    func setAppearance(_ texture: String) {
        currentTexture = texture
        materials.isHidden = texture != "liquid"
        if ["leopard", "liquid"].contains(texture), let screen = window?.screen ?? NSScreen.main, let url = NSWorkspace.shared.desktopImageURL(for: screen) {
            wallpaper.show(url, softened: texture == "liquid", displayWidth: screen.frame.width)
        }
        else { wallpaper.image = nil }
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool { dismiss(); return false }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool { showDashboard(); return true }
    @objc func addWidgets() { showDashboard(); webView.evaluateJavaScript("Dashboard.toggleShelf(true)", completionHandler: nil) }
    @objc func createWidget() { showDashboard(); webView.evaluateJavaScript("Dashboard.openStudio()", completionHandler: nil) }
    @objc func settings() { showDashboard(); webView.evaluateJavaScript("Dashboard.openSettings()", completionHandler: nil) }
    @objc func importWidget() { Task { await bridge.importWidget() } }
    @objc func spaceHelp() {
        let alert = NSAlert()
        alert.messageText = "Keep Dashboard beside your desktops"
        alert.informativeText = "Choose Use as a Space. Dashboard requests the leftmost position using private SkyLight operations and checks its position when Spaces change. Settings shows whether the move succeeded.\n\nIf your macOS version refuses the move, open Mission Control and drag Dashboard’s thumbnail as far left as macOS allows. Turning off ‘Automatically rearrange Spaces based on most recent use’ in System Settings → Desktop & Dock can help retain a manually chosen position.\n\nQuitting removes Dashboard’s Space; opening the app creates and pins it again. The ⌃⌥D shortcut works from any Space."
        alert.addButton(withTitle: "Open Mission Control"); alert.addButton(withTitle: "Done")
        if alert.runModal() == .alertFirstButtonReturn { NSWorkspace.shared.open(URL(fileURLWithPath: "/System/Applications/Mission Control.app")) }
    }
    @objc func about() { NSApp.orderFrontStandardAboutPanel(options: [.applicationName: "Dashboard", .applicationVersion: "0.1", .credits: NSAttributedString(string: "A recreation of the classic Mac Dashboard.\nBuilt for today’s Mac. Independently made; not an Apple product.")]) }
    func application(_ sender: NSApplication, openFiles filenames: [String]) { pendingImports += filenames.map { URL(fileURLWithPath: $0) }; bridge?.consumeImports() }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if isTest || bridge?.loaded != true || preparingToQuit { return .terminateNow }
        preparingToQuit = true
        Task { @MainActor in
            _ = try? await webView.callAsyncJavaScript("await Dashboard.flushSave()", arguments: [:], in: nil, contentWorld: .page)
            NSApp.reply(toApplicationShouldTerminate: true)
        }
        return .terminateLater
    }
    func applicationWillTerminate(_ notification: Notification) { bridge?.generator.cancel(); if let hotKey { UnregisterEventHotKey(hotKey) }; if let f12HotKey { UnregisterEventHotKey(f12HotKey) } }
}

final class ResourceHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "app", let root = Bundle.main.resourceURL?.appendingPathComponent("Web") else { task.didFailWithError(URLError(.badURL)); return }
        let path = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else { task.didFailWithError(URLError(.fileDoesNotExist)); return }
        let mime = ["html": "text/html", "js": "application/javascript", "css": "text/css", "svg": "image/svg+xml", "png": "image/png"][file.pathExtension] ?? "application/octet-stream"
        task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: "utf-8")); task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
