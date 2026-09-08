import AppKit

@MainActor final class SpacePinning {
    weak var app: AppDelegate?
    private var observer: NSObjectProtocol?
    private var pending = false
    private(set) var enabled = false
    private(set) var lastResult: [String: Any] = [:]
    init(app: AppDelegate) {
        self.app = app
        observer = NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.activeSpaceDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.enabled, !self.pending else { return }
                _ = await self.pin()
            }
        }
    }
    func pin() async -> [String: Any] {
        guard let app, app.window.styleMask.contains(.fullScreen) else { return ["pinned": false, "message": "Choose Use as a Space, then Pin Dashboard to the Left."] }
        guard !pending else { return lastResult }
        pending = true
        defer { pending = false }
        let request = DSRequestPinWindowSpace(UInt32(app.window.windowNumber)) as? [String: Any] ?? [:]
        guard request["requested"] as? Bool == true else { lastResult = request; return request }
        for _ in 0..<6 {
            try? await Task.sleep(nanoseconds: 300_000_000)
            if DSIsWindowSpaceFirst(UInt32(app.window.windowNumber)) {
                enabled = true
                UserDefaults.standard.set(true, forKey: "pinSpace")
                // Reattach the existing WebKit surface after a WindowServer Space
                // move. On macOS 27, promoted fixed-position layers can otherwise
                // retain their pre-move presentation until the surface is renewed.
                if request["alreadyFirst"] as? Bool != true, let container = app.webView.superview {
                    let frame = app.webView.frame
                    app.webView.removeFromSuperview()
                    app.webView.frame = frame
                    container.addSubview(app.webView)
                    app.window.makeFirstResponder(app.webView)
                }
                lastResult = ["pinned": true, "method": request["method"] ?? lastResult["method"] ?? "Already first", "message": "Dashboard is pinned at the left. Its position is checked when Spaces change."]
                return lastResult
            }
        }
        enabled = false
        lastResult = ["pinned": false, "method": request["method"] ?? "Unavailable", "message": "macOS accepted the request but did not move Dashboard. Drag its thumbnail left in Mission Control. Private Space reordering is restricted on this macOS build."]
        return lastResult
    }
    func stop() { enabled = false }
    deinit { if let observer { NSWorkspace.shared.notificationCenter.removeObserver(observer) } }
}
