import Foundation

enum DashboardError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let message) = self { return message }; return nil }
}

final class LocalStore {
    let directory: URL
    var stateURL: URL { directory.appendingPathComponent("dashboard.json") }
    init() throws {
        let override = ProcessInfo.processInfo.environment["DASHBOARD_DATA_DIR"]
        directory = override.map { URL(fileURLWithPath: $0) } ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Dashboard 2026", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
    func read() throws -> Any {
        guard FileManager.default.fileExists(atPath: stateURL.path) else { return NSNull() }
        return try JSONSerialization.jsonObject(with: Data(contentsOf: stateURL))
    }
    func write(_ object: Any) throws {
        guard let state = object as? [String: Any], state["widgets"] is [Any] else { throw DashboardError.message("Invalid dashboard layout.") }
        let data = try JSONSerialization.data(withJSONObject: state, options: [.prettyPrinted, .sortedKeys])
        guard data.count < 20_000_000 else { throw DashboardError.message("This layout is too large to save (20 MB limit).") }
        if let previous = try? Data(contentsOf: stateURL) { try previous.write(to: directory.appendingPathComponent("dashboard.backup.json"), options: .atomic) }
        try data.write(to: stateURL, options: .atomic)
    }
}

struct WidgetManifest: Codable {
    let version: Int
    let name: String
    let width: Int
    let height: Int
    let html: String
    var kind: String? = nil
    var size: String? = nil
    var connection: WidgetConnection? = nil
    func validate() throws {
        guard [1, 2].contains(version), !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.count <= 80,
              (140...800).contains(width), (100...700).contains(height), !html.isEmpty, html.utf8.count <= 1_000_000 else {
            throw DashboardError.message("Widget needs version 1 or 2, a name, width 140–800, height 100–700, and HTML under 1 MB.")
        }
        if version == 2 {
            guard ["small", "medium", "large"].contains(size ?? ""), ["tool", "connected"].contains(kind ?? "") else { throw DashboardError.message("Choose a widget size and a working connection or offline tool.") }
            let dimensions = ["small": (170, 170), "medium": (348, 170), "large": (348, 360)][size!]!
            guard width == dimensions.0, height == dimensions.1 else { throw DashboardError.message("The widget dimensions do not match its selected size.") }
            if kind == "connected" { guard let connection else { throw DashboardError.message("This widget needs a data source.") }; try connection.validate() }
            else if connection != nil { throw DashboardError.message("Offline widgets cannot declare a hidden connection.") }
        }
    }
    static func parse(_ text: String) throws -> WidgetManifest {
        var clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.hasPrefix("```") { clean = clean.components(separatedBy: "\n").dropFirst().dropLast().joined(separator: "\n") }
        guard let start = clean.firstIndex(of: "{"), let end = clean.lastIndex(of: "}") else { throw DashboardError.message("The model did not return a widget. Try again with a more specific description.") }
        let widget = try JSONDecoder().decode(WidgetManifest.self, from: Data(clean[start...end].utf8))
        try widget.validate()
        return widget
    }
}
