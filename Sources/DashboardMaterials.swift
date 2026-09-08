import AppKit

/// Native Liquid Glass underneath the WebKit controls. Content remains in WebKit
/// so keyboard navigation, hit testing and accessibility have a single owner.
@MainActor final class DashboardMaterials: NSView {
    private var surfaces: [String: NSView] = [:]
    static var supportsGlass: Bool { if #available(macOS 26.0, *) { return true }; return false }
    override var isFlipped: Bool { true }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }

    func update(_ data: [String: Any]) {
        guard let items = data["surfaces"] as? [[String: Any]], items.count <= 160 else { return }
        var active = Set<String>()
        for item in items {
            guard let id = item["id"] as? String,
                  let x = item["x"] as? Double, let y = item["y"] as? Double,
                  let width = item["width"] as? Double, let height = item["height"] as? Double,
                  [x, y, width, height].allSatisfy({ $0.isFinite }), width > 0, height > 0 else { continue }
            active.insert(id)
            let view: NSView
            if let existing = surfaces[id] { view = existing }
            else {
                if #available(macOS 26.0, *) {
                    let glass = NSGlassEffectView()
                    glass.style = item["kind"] as? String == "widget" ? .clear : .regular
                    glass.appearance = NSAppearance(named: .darkAqua)
                    glass.tintColor = nil
                    view = glass
                } else {
                    let effect = NSVisualEffectView()
                    effect.material = .hudWindow
                    effect.blendingMode = .withinWindow
                    effect.state = .active
                    view = effect
                }
                surfaces[id] = view
                addSubview(view)
            }
            view.frame = NSRect(x: x, y: y, width: min(width, bounds.width), height: min(height, bounds.height))
            if #available(macOS 26.0, *), let glass = view as? NSGlassEffectView { glass.cornerRadius = item["radius"] as? Double ?? 24 }
            view.alphaValue = max(0, min(1, item["opacity"] as? Double ?? 1))
        }
        for id in Array(surfaces.keys) where !active.contains(id) { surfaces.removeValue(forKey: id)?.removeFromSuperview() }
    }
}
