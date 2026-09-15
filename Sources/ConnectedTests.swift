import Foundation

extension AppDelegate {
    func connectedTests(live: Bool) async throws -> [String: Any] {
        var report: [String: Any] = [:]
        func check(_ name: String, _ passed: Bool) throws {
            report[name] = passed
            if !passed { throw DashboardError.message(name) }
        }
        let assets = bridge.store.directory.appendingPathComponent("resource-fixture")
        let assetLink = bridge.store.directory.appendingPathComponent("resource-alias")
        try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)
        try Data("fixture".utf8).write(to: assets.appendingPathComponent("index.html"))
        try FileManager.default.createSymbolicLink(at: assetLink, withDestinationURL: assets)
        try FileManager.default.createSymbolicLink(at: assets.appendingPathComponent("outside"), withDestinationURL: bridge.store.directory)
        let resolved = ResourceHandler.resourceURL(root: assetLink, path: "index.html")
        try check("bundled resources load through a symlinked app path", resolved.flatMap { try? String(contentsOf: $0, encoding: .utf8) } == "fixture")
        try check("resource traversal outside the bundle is rejected", ResourceHandler.resourceURL(root: assets, path: "../smoke-result.json") == nil)
        try check("resource symlinks cannot escape the bundle", ResourceHandler.resourceURL(root: assets, path: "outside/dashboard.json") == nil)
        for address in ["https://127.0.0.1", "https://10.1.2.3", "https://192.168.1.1", "https://169.254.169.254", "https://[::1]", "https://localhost", "http://example.com", "https://example.com:8443"] {
            var blocked = false
            do { try PublicWeb.validate(URL(string: address)!) } catch { blocked = true }
            try check("blocked \(address)", blocked)
        }
        let page = PublicWeb.text(Data("<head>fake price</head><script>fabricated</script><p>Actual &amp; verified: &#36;18.</p>".utf8))
        try check("source extraction excludes script and metadata", page == "Actual & verified: $18.")
        let redacted = ConnectedDataService.redacted(["nested": [["key": "Bearer test-secret"]]], secret: "test-secret")
        let encoded = String(decoding: try JSONSerialization.data(withJSONObject: redacted), as: UTF8.self)
        try check("API credentials are redacted recursively", !encoded.contains("test-secret") && encoded.contains("[redacted]"))
        let now = Date(timeIntervalSince1970: 1_000_000)
        try check("stale and future observations are rejected", !WeatherService.fresh(990_000, now: now) && !WeatherService.fresh(1_002_000, now: now) && WeatherService.fresh(999_500, now: now))
        try check("observed temperatures convert correctly", WeatherService.celsius(25, unit: "Fahrenheit") == 77 && WeatherService.celsius(25, unit: "Celsius") == 25)
        try check("Downtown station is within one kilometre of SF", WeatherService.distance(37.77493, -122.41942, 37.77056, -122.42694) < 1)
        for status in [202, 204] {
            var pending = false
            do { try ConnectedDataService.requireData(status) } catch { pending = true }
            try check("HTTP \(status) is pending data rather than a complete dataset", pending)
        }
        try check("paginated APIs are marked incomplete", ConnectedDataService.hasNextPage("<https://api.github.com/page=2>; rel=\"next\", <https://api.github.com/page=9>; rel=\"last\"") && !ConnectedDataService.hasNextPage(""))
        guard live else { return report }
        let weather = try await bridge.weather.forecast(["latitude": 37.77493, "longitude": -122.41942, "unit": "Fahrenheit"])
        try check("weather includes source and retrieval time", weather["source"] is [String: Any] && weather["retrievedAt"] is Double)
        report["weather"] = weather
        let json = WidgetConnection(mode: "json", url: "https://api.weather.gov/stations/SFOC1/observations/latest", query: "Current observed temperature", itemsPath: "properties", fields: [WidgetField(label: "Temperature °C", path: "temperature.value")], parameters: [], auth: nil, actionLabel: "Open source")
        let result = try await bridge.connected.read(id: "test-json", credentialID: "test-json", connection: json, values: [:], provider: "codex", endpoint: "", model: "")
        try check("native JSON connection returns actual provider data", result["payload"] is [String: Any])
        report["json"] = result
        let raw = try await bridge.generator.generate(prompt: "Create a Fandango widget to find and book real movie tickets by ZIP and date. Use its real website for checkout. Do not create sample prices or a local ticket planner.", provider: "codex", endpoint: "", model: "", size: "medium")
        let manifest = try WidgetManifest.parse(raw)
        try check("live Codex generation selects a real connection at medium size", manifest.kind == "connected" && manifest.size == "medium" && manifest.width == 348 && manifest.height == 170)
        try JSONEncoder().encode(manifest).write(to: bridge.store.directory.appendingPathComponent("generated-fandango.dashboardwidget"))
        let evidence = WidgetConnection(mode: "agent", url: "https://example.com", query: "What is this domain intended for? Quote the exact sentence explaining its purpose.", itemsPath: "", fields: [], parameters: [], auth: nil, actionLabel: "Open source")
        for provider in ["codex", "claude"] {
            let result = try await bridge.connected.read(id: "test-\(provider)", credentialID: "test", connection: evidence, values: [:], provider: provider, endpoint: "", model: "")
            try check("\(provider) web check returns independently verified source text", !(result["items"] as? [[String: String]] ?? []).isEmpty)
            report[provider] = result
        }
        return report
    }
}
