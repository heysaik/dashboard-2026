import AppKit
import CoreImage

/// Keep the desktop recognizable while removing fine detail behind widget text.
@MainActor final class DashboardWallpaper: NSImageView {
    private let imageContext = CIContext(options: [.cacheIntermediates: false])
    private var cacheKey = ""
    private var original: NSImage?
    private var softened: NSImage?

    func show(_ url: URL, softened shouldSoften: Bool, displayWidth: CGFloat) {
        let modified = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
        let key = "\(url.path):\(modified?.timeIntervalSince1970 ?? 0):\(displayWidth)"
        if key != cacheKey {
            cacheKey = key
            original = NSImage(contentsOf: url)
            softened = nil
        }
        if shouldSoften, softened == nil, let original,
           let source = original.cgImage(forProposedRect: nil, context: nil, hints: nil) {
            let input = CIImage(cgImage: source)
            let radius = 10 * CGFloat(source.width) / max(1, displayWidth)
            let output = input.clampedToExtent()
                .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: radius])
                .cropped(to: input.extent)
            if let rendered = imageContext.createCGImage(output, from: input.extent) {
                softened = NSImage(cgImage: rendered, size: original.size)
            }
        }
        image = shouldSoften ? softened ?? original : original
    }
}
