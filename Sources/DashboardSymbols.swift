import AppKit

/// Render the installed OS's SF Symbols without bundling third-party lookalikes.
@MainActor enum DashboardSymbols {
    static let images: [String: String] = {
        let names = [
            "plus": "plus", "minus": "minus", "close": "xmark", "info": "info",
            "arrow": "arrow.right", "left": "chevron.left", "right": "chevron.right",
            "swap": "arrow.up.arrow.down", "settings": "gearshape", "spark": "square.and.pencil",
            "weather": "sun.max", "clock": "clock", "calendar": "calendar",
            "calculator": "calculator", "stickies": "note.text", "dictionary": "book.closed",
            "converter": "ruler", "currency": "dollarsign.circle", "stocks": "chart.xyaxis.line",
            "translation": "character.bubble", "contacts": "person.crop.rectangle", "tilegame": "puzzlepiece",
            "music": "music.note", "google": "magnifyingglass", "business": "building.2",
            "people": "person.2", "flight": "airplane", "sports": "sportscourt",
            "ski": "snowflake", "movies": "film", "webclip": "globe",
            "play": "play.fill", "previous": "backward.end.fill", "next": "forward.end.fill"
        ]
        var result: [String: String] = [:]
        let configuration = NSImage.SymbolConfiguration(pointSize: 18, weight: .regular)
            .applying(.init(paletteColors: [.white]))
        for (key, name) in names {
            guard let symbol = NSImage(systemSymbolName: name, accessibilityDescription: nil)?.withSymbolConfiguration(configuration),
                  let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 72, pixelsHigh: 72,
                    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
                  let context = NSGraphicsContext(bitmapImageRep: bitmap) else { continue }
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = context
            context.cgContext.scaleBy(x: 3, y: 3)
            let scale = min(1, 20 / max(symbol.size.width, symbol.size.height))
            let size = NSSize(width: symbol.size.width * scale, height: symbol.size.height * scale)
            symbol.draw(in: NSRect(x: (24 - size.width) / 2, y: (24 - size.height) / 2, width: size.width, height: size.height))
            NSGraphicsContext.restoreGraphicsState()
            if let data = bitmap.representation(using: .png, properties: [:]) {
                result[key] = "data:image/png;base64," + data.base64EncodedString()
            }
        }
        return result
    }()
}
