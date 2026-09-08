import Foundation

@MainActor final class WidgetGenerator {
    private var process: Process?
    private var task: URLSessionDataTask?
    private(set) var running = false
    private var cancelled = false
    static let schema = """
    {"type":"object","properties":{"version":{"type":"integer","enum":[1]},"name":{"type":"string"},"width":{"type":"integer"},"height":{"type":"integer"},"html":{"type":"string"}},"required":["version","name","width","height","html"],"additionalProperties":false}
    """
    static let instructions = """
    Create one functional, beautiful Mac OS X Dashboard widget. Return ONLY a JSON object with version:1, name:string (max 80 characters), width:integer (140–800), height:integer (100–700), html:string (a complete self-contained HTML document). Do not use tools, inspect files, execute commands, or include Markdown fences.
    No decorative labels above headings, emoji icons, external dependencies, custom fonts, or placeholder data. Follow the requested Dashboard theme below.
    Your HTML runs in a sandboxed iframe with inline CSS and JavaScript enabled. No network, native APIs, external images, popups, file access, cookies or localStorage. Draw illustrations with inline SVG/CSS/canvas. All timers/calculations must actually work. Use system fonts. Body margin:0; transparent outside your widget; fit width and height; box-sizing:border-box. Do not include a drag handle or close/info controls; the host supplies them. Keep text legible at actual size.
    For persistent state use window.dashboardState (initial JSON value), then call window.saveDashboardState(value) with JSON-serializable values whenever state changes. Those APIs are injected by the host before your scripts. Make all buttons and form controls keyboard accessible. Respect prefers-reduced-motion. Render useful empty states instead of invented live data. Do not promise data connections you cannot access.
    """

    func executable(_ name: String) -> URL? {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        // The npm Codex CLI may coexist with an obsolete Homebrew installation.
        // Prefer its canonical location before a GUI app's inherited PATH.
        let preferred = name == "codex" ? ["/usr/local/bin", "\(home)/.local/bin"] : ["\(home)/.local/bin"]
        let dirs = preferred + (ProcessInfo.processInfo.environment["PATH"] ?? "").components(separatedBy: ":").filter { !$0.isEmpty } + ["/opt/homebrew/bin", "\(home)/.lmstudio/bin"]
        return dirs.map { URL(fileURLWithPath: $0).appendingPathComponent(name) }.first { FileManager.default.isExecutableFile(atPath: $0.path) }
    }
    func providers(endpoint: String) async -> [String: Any] {
        var models: [String] = []
        var message = "Server not running"
        do {
            let url = try localURL(endpoint, path: "models")
            var request = URLRequest(url: url); request.timeoutInterval = 3
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw DashboardError.message("Server requires authentication or returned an error") }
            let body = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            models = (body?["data"] as? [[String: Any]] ?? []).compactMap { $0["id"] as? String }
            message = models.isEmpty ? "Server running; load a model in LM Studio" : "Server ready"
        } catch { message = error.localizedDescription }
        return ["claude": executable("claude") != nil, "codex": executable("codex") != nil, "lmstudio": !models.isEmpty, "models": models, "lmstudioMessage": message]
    }
    func localURL(_ base: String, path: String) throws -> URL {
        guard let url = URL(string: base), ["http", "https"].contains(url.scheme ?? ""), ["localhost", "127.0.0.1", "[::1]", "::1"].contains(url.host ?? ""), url.user == nil, url.password == nil, url.query == nil, url.fragment == nil else {
            throw DashboardError.message("Use a local LM Studio URL, such as http://127.0.0.1:1234/v1.")
        }
        return url.appendingPathComponent(path)
    }
    func cancel() {
        cancelled = true; task?.cancel()
        if let process, process.isRunning {
            process.terminate()
            let pid = process.processIdentifier
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { if process.isRunning { kill(pid, SIGKILL) } }
        }
    }
    func generate(prompt: String, provider: String, endpoint: String, model: String, widget: Bool = true, theme: String = "leopard") async throws -> String {
        guard !running else { throw DashboardError.message("A request is already running. Wait for it or cancel it first.") }
        guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, prompt.count <= 12_000 else { throw DashboardError.message("Enter a description under 12,000 characters.") }
        running = true; cancelled = false
        defer { running = false; process = nil; task = nil }
        let style = theme == "liquid"
            ? "Match current Apple system widgets in clear rendering mode: 170x170 for small widgets, 348x170 for medium, or 348x360 for large. Use a transparent background with white foreground content, compact SF-style system typography, a large primary value, and carefully aligned supporting content with 16-point outer insets. Use neutral translucent controls and 22-point outer corners. The host supplies the native glass material. Do not draw chrome, gradients, decorative icons or layered cards. Respond to window.dashboardTheme and the dashboardthemechange event if you customize theme-specific behavior."
            : "Recreate Leopard skeuomorphic Dashboard styling: real-looking materials, beveled edges, dimensional controls, subtle texture, strong typography, delicate highlights and deep soft shadows."
        let system = widget ? Self.instructions + "\n" + style : "Translate accurately. Return only the translation, with no commentary. Do not use any tools."
        if provider == "lmstudio" {
            var request = URLRequest(url: try localURL(endpoint, path: "chat/completions"))
            request.httpMethod = "POST"; request.timeoutInterval = 180
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["model": model.isEmpty ? "local-model" : model, "messages": [["role": "system", "content": system], ["role": "user", "content": prompt]], "temperature": 0.65, "max_tokens": widget ? 10000 : 3000, "stream": false])
            let (data, response): (Data, URLResponse) = try await withCheckedThrowingContinuation { continuation in
                let dataTask = URLSession.shared.dataTask(with: request) { data, response, error in
                    if let error { continuation.resume(throwing: error) }
                    else if let data, let response { continuation.resume(returning: (data, response)) }
                    else { continuation.resume(throwing: DashboardError.message("LM Studio returned no response.")) }
                }
                task = dataTask; dataTask.resume()
            }
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw DashboardError.message("LM Studio returned HTTP \((response as? HTTPURLResponse)?.statusCode ?? 0). Check that a model is loaded and the local server is running.") }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let choices = json?["choices"] as? [[String: Any]], let message = choices.first?["message"] as? [String: Any], let result = message["content"] as? String else { throw DashboardError.message("LM Studio returned an unreadable response.") }
            return result
        }
        guard ["claude", "codex"].contains(provider), let executable = executable(provider) else { throw DashboardError.message("Install \(provider == "claude" ? "Claude Code" : "Codex") and sign in using its terminal app first.") }
        let scratch = FileManager.default.temporaryDirectory.appendingPathComponent("dashboard-generation-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: scratch, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: scratch) }
        let output = scratch.appendingPathComponent("result.txt")
        var arguments: [String]
        if provider == "claude" {
            arguments = ["--print", "--safe-mode", "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--output-format", "json", "--system-prompt", system]
            if widget { arguments += ["--json-schema", Self.schema] }
        } else {
            arguments = ["exec", "--ignore-user-config", "--skip-git-repo-check", "--ephemeral", "--sandbox", "read-only", "--color", "never", "--output-last-message", output.path]
            if widget {
                let schema = scratch.appendingPathComponent("schema.json"); try Self.schema.write(to: schema, atomically: true, encoding: .utf8)
                arguments += ["--output-schema", schema.path]
            }
            arguments += ["-"]
        }
        let stdout = scratch.appendingPathComponent("stdout.txt"); let stderr = scratch.appendingPathComponent("stderr.txt")
        FileManager.default.createFile(atPath: stdout.path, contents: nil)
        FileManager.default.createFile(atPath: stderr.path, contents: nil)
        let outHandle = try FileHandle(forWritingTo: stdout), errHandle = try FileHandle(forWritingTo: stderr)
        defer { try? outHandle.close(); try? errHandle.close() }
        let child = Process(); child.executableURL = executable; child.arguments = arguments; child.currentDirectoryURL = scratch
        var environment = ProcessInfo.processInfo.environment
        environment["PATH"] = "\(FileManager.default.homeDirectoryForCurrentUser.path)/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
        environment.removeValue(forKey: "CLAUDECODE"); environment.removeValue(forKey: "CLAUDE_CODE_ENTRYPOINT")
        child.environment = environment; child.standardOutput = outHandle; child.standardError = errHandle
        let input = Pipe(); child.standardInput = input
        process = child
        let timeout = Task { try? await Task.sleep(nanoseconds: 180_000_000_000); if !Task.isCancelled { self.cancel() } }
        defer { timeout.cancel() }
        let code: Int32 = try await withCheckedThrowingContinuation { continuation in
            child.terminationHandler = { process in continuation.resume(returning: process.terminationStatus) }
            do {
                try child.run()
                let inputText = provider == "claude" ? prompt : system + "\n\nWidget request:\n" + prompt
                try input.fileHandleForWriting.write(contentsOf: Data(inputText.utf8)); try input.fileHandleForWriting.close()
            } catch { child.terminationHandler = nil; if child.isRunning { child.terminate() }; continuation.resume(throwing: error) }
        }
        if cancelled { throw DashboardError.message("Generation cancelled or timed out. Your dashboard has not changed.") }
        let raw = (try? String(contentsOf: stdout, encoding: .utf8)) ?? ""
        guard code == 0 else {
            let detail = ((try? String(contentsOf: stderr, encoding: .utf8)) ?? raw).suffix(1200)
            throw DashboardError.message("\(provider == "claude" ? "Claude Code" : "Codex") could not complete the request. Check its sign-in and usage in Terminal.\n\(detail)")
        }
        if provider == "codex" { return try String(contentsOf: output, encoding: .utf8) }
        if let json = try? JSONSerialization.jsonObject(with: Data(raw.utf8)) as? [String: Any] {
            if json["is_error"] as? Bool == true { throw DashboardError.message(json["result"] as? String ?? "Claude Code returned an error.") }
            if let structured = json["structured_output"] { return String(data: try JSONSerialization.data(withJSONObject: structured), encoding: .utf8)! }
            if let result = json["result"] as? String { return result }
        }
        return raw
    }
}
