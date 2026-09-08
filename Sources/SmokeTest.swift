import AppKit
import WebKit

extension AppDelegate {
    func runSmokeTest() {
        Task { @MainActor in
            do {
                for _ in 0..<50 {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    if (try? await webView.evaluateJavaScript("typeof Dashboard !== 'undefined' && Dashboard.ready")) as? Bool == true { break }
                }
                let results = try await webView.callAsyncJavaScript("return await Dashboard.runSmokeTests()", arguments: [:], in: nil, contentWorld: .page)
                var report: [String: Any] = ["tests": results ?? [], "success": true, "macOS": ProcessInfo.processInfo.operatingSystemVersionString]
                if ProcessInfo.processInfo.arguments.contains("--test-space") {
                    setSpace()
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    report["spacePinning"] = await pinning.pin()
                    fillScreen()
                    let screenFrame = (window.screen ?? NSScreen.main)!.frame
                    report["display"] = ["window": NSStringFromRect(window.frame), "screen": NSStringFromRect(screenFrame), "webView": NSStringFromRect(webView.frame), "environment": environment()]
                    try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]).write(to: bridge.store.directory.appendingPathComponent("display-tests.json"), options: .atomic)
                    guard abs(window.frame.width - screenFrame.width) < 1, abs(window.frame.height - screenFrame.height) < 1, abs(window.frame.minY - screenFrame.minY) < 1, abs(webView.frame.height - screenFrame.height) < 1 else { throw DashboardError.message("Full-screen content does not cover the entire display.") }
                    report["fullscreenShelf"] = try await webView.callAsyncJavaScript("Dashboard.toggleShelf(true); await new Promise(r=>setTimeout(r,800)); const shelf=document.getElementById('shelf');return {rect:JSON.stringify(shelf.getBoundingClientRect()),controls:getComputedStyle(document.getElementById('controls')).bottom,hidden:document.hidden,animations:document.getAnimations().map(a=>({time:a.currentTime,state:a.playState}))};", arguments: [:], in: nil, contentWorld: .page)
                    report["fullscreenSettings"] = try await webView.callAsyncJavaScript("Dashboard.toggleShelf(false); Dashboard.setTheme('liquid'); await Dashboard.openSettings(); await new Promise(r=>setTimeout(r,900));const dialog=document.querySelector('.dialog');return {rect:JSON.stringify(dialog.getBoundingClientRect()),opacity:getComputedStyle(dialog).opacity,hidden:document.hidden,animations:document.getAnimations().map(a=>({time:a.currentTime,state:a.playState}))};", arguments: [:], in: nil, contentWorld: .page)
                    report["nativeMaterialCount"] = materials.subviews.count
                }
                try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]).write(to: bridge.store.directory.appendingPathComponent("native-tests.json"), options: .atomic)
                if ProcessInfo.processInfo.arguments.contains("--test-ai") {
                    let manifest = try await bridge.generator.generate(prompt: "Make a small brass mechanical counter with a plus and minus button and a reset button. Persist the count. Size 220 by 180.", provider: "codex", endpoint: "http://127.0.0.1:1234/v1", model: "")
                    let widget = try WidgetManifest.parse(manifest)
                    report["generation"] = ["provider": "codex", "name": widget.name, "htmlBytes": widget.html.utf8.count]
                    let widgetData = try JSONEncoder().encode(widget)
                    try widgetData.write(to: bridge.store.directory.appendingPathComponent("generated-counter.dashboardwidget"), options: .atomic)
                    let json = String(decoding: widgetData, as: UTF8.self)
                    try await webView.evaluateJavaScript("Dashboard.previewImport(\(json))")
                }
                try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]).write(to: bridge.store.directory.appendingPathComponent("smoke-result.json"), options: .atomic)
                print("DASHBOARD_SMOKE_OK \(bridge.store.directory.path)")
                fflush(stdout)
                if ProcessInfo.processInfo.arguments.contains("--keep-open") { return }
                NSApp.terminate(nil)
            } catch {
                let report: [String: Any] = ["success": false, "error": error.localizedDescription, "detail": String(describing: (error as NSError).userInfo)]
                try? JSONSerialization.data(withJSONObject: report, options: .prettyPrinted).write(to: bridge.store.directory.appendingPathComponent("smoke-result.json"), options: .atomic)
                print("DASHBOARD_SMOKE_FAILED \(error.localizedDescription)"); fflush(stdout)
                exit(1)
            }
        }
    }
}
