import AppKit

let output = CommandLine.arguments[1]
let size = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()
let rect = NSRect(x: 72, y: 72, width: 880, height: 880)
let shadow = NSShadow(); shadow.shadowColor = NSColor.black.withAlphaComponent(0.55); shadow.shadowBlurRadius = 28; shadow.shadowOffset = NSSize(width: 0, height: -13)
NSGraphicsContext.saveGraphicsState(); shadow.set()
NSGradient(colors: [.white, NSColor(white: 0.36, alpha: 1), NSColor(white: 0.86, alpha: 1), NSColor(white: 0.30, alpha: 1)])!.draw(in: NSBezierPath(ovalIn: rect), angle: -50)
NSGraphicsContext.restoreGraphicsState()
let face = NSBezierPath(ovalIn: rect.insetBy(dx: 24, dy: 24))
NSGradient(starting: NSColor(white: 0.21, alpha: 1), ending: NSColor(white: 0.025, alpha: 1))!.draw(in: face, angle: -90)
NSColor.black.setStroke(); face.lineWidth = 6; face.stroke()
for i in 0...44 {
    let angle = (Double(i) * 6 + 138) * Double.pi / 180
    let outer = 379.0, inner = i % 4 == 0 ? 341.0 : 359.0
    let path = NSBezierPath(); path.move(to: NSPoint(x: 512 + cos(angle) * inner, y: 512 + sin(angle) * inner)); path.line(to: NSPoint(x: 512 + cos(angle) * outer, y: 512 + sin(angle) * outer)); path.lineWidth = i % 4 == 0 ? 5 : 2
    NSColor(white: i % 4 == 0 ? 0.93 : 0.5, alpha: 1).setStroke(); path.stroke()
}
for (index, number) in ["0", "20", "40", "60", "80", "100"].enumerated() {
    let angle = (Double(index) * 48 + 150) * Double.pi / 180
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont(name: "Helvetica Neue", size: 49)!, .foregroundColor: NSColor(white: 0.9, alpha: 1)]
    let value = NSAttributedString(string: number, attributes: attrs); let measure = value.size()
    value.draw(at: NSPoint(x: 512 + cos(angle) * 288 - measure.width / 2, y: 512 + sin(angle) * 288 - measure.height / 2))
}
for (cx, cy, radius, angle) in [(352.0, 367.0, 98.0, 1.1), (676.0, 367.0, 98.0, 2.2)] {
    let r = NSRect(x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2)
    NSGradient(starting: NSColor(white: 0.45, alpha: 1), ending: NSColor(white: 0.12, alpha: 1))!.draw(in: NSBezierPath(ovalIn: r), angle: -90)
    let inner = NSBezierPath(ovalIn: r.insetBy(dx: 8, dy: 8)); NSColor(white: 0.05, alpha: 1).setFill(); inner.fill()
    for i in 0..<12 { let a = Double(i) * Double.pi / 6; let line = NSBezierPath(); line.move(to: NSPoint(x: cx + cos(a) * 71, y: cy + sin(a) * 71)); line.line(to: NSPoint(x: cx + cos(a) * 81, y: cy + sin(a) * 81)); line.lineWidth = 3; NSColor.lightGray.setStroke(); line.stroke() }
    let needle = NSBezierPath(); needle.move(to: NSPoint(x: cx, y: cy)); needle.line(to: NSPoint(x: cx + cos(angle) * 69, y: cy + sin(angle) * 69)); needle.lineWidth = 5; NSColor.white.setStroke(); needle.stroke()
}
let needle = NSBezierPath(); needle.move(to: NSPoint(x: 503, y: 480)); needle.line(to: NSPoint(x: 387, y: 796)); needle.line(to: NSPoint(x: 521, y: 500)); needle.close(); NSColor(calibratedRed: 0.91, green: 0.18, blue: 0.13, alpha: 1).setFill(); needle.fill()
let center = NSBezierPath(ovalIn: NSRect(x: 488, y: 488, width: 48, height: 48)); NSGradient(starting: .lightGray, ending: .darkGray)!.draw(in: center, angle: -90)
let shine = NSBezierPath(); shine.move(to: NSPoint(x: 122, y: 603)); shine.curve(to: NSPoint(x: 902, y: 603), controlPoint1: NSPoint(x: 246, y: 998), controlPoint2: NSPoint(x: 778, y: 998)); shine.curve(to: NSPoint(x: 122, y: 603), controlPoint1: NSPoint(x: 689, y: 475), controlPoint2: NSPoint(x: 335, y: 475)); NSColor.white.withAlphaComponent(0.10).setFill(); shine.fill()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output))
