# Spaces implementation

Dashboard is an ordinary AppKit app with two presentation modes:

1. A native full-screen window, which causes AppKit/Dock to create and manage a dedicated Space.
2. A borderless transparent overlay that joins all Spaces and returns to the previous application when dismissed.

The full-screen window is styled with the user's existing desktop picture. Overlay mode displays the actual windows underneath it. The global Carbon shortcut is Control–Option–D; no Accessibility permission is needed for that shortcut.

## Private pinning

The user explicitly authorized private APIs and distribution outside the Mac App Store. `PrivateSpaces.m` dynamically resolves SkyLight symbols, reads the Space that contains **only Dashboard's own window**, and requests index zero using `SLSBridgedMoveManagedSpaceToDisplayIndexOperation`. On systems without the bridge it can try `SLSMoveManagedSpaceToDisplayIndex`.

The asynchronous bridge function is resolved from the loaded Mach-O symbol table, without hardcoded code offsets, memory patches, Dock injection, or changes to SIP. Each operation is checked against a new `SLSCopyManagedDisplaySpaces` result. Returning from the private function is not considered success. Once confirmed, the position is checked again when Spaces change.

After an actual move, the existing WebKit view is reattached to its container. This refreshes its presentation surface, which otherwise left fixed-position shelf and modal layers invisible on the tested macOS build. The same view and document remain alive, preserving widget state.

If the operating system refuses the move, the app reports that and keeps its full-screen Space. The operation does not reorder ordinary user desktop Spaces or destroy any Space. Exiting full screen and quitting use AppKit's normal lifecycle. macOS can change private APIs in an update; the code checks function, class, and selector availability before calling them.

## Full display and camera housing

The app opts out of display safe-area compatibility mode and sizes the window, content container, wallpaper, and WebKit view to `NSScreen.frame`. Full-screen presentation automatically hides the menu bar and Dock.

On the tested macOS 27 build, those public settings alone still reserved 33 points above the content. `DSAllowFullDisplayContent()` checks the private `_NSFullScreenContentController` class and the Boolean signature of `reservesSpaceForMenuBarInFullScreen`, then replaces that method inside this process to return false. It does not modify AppKit on disk, other apps, the Dock, or system security settings. If the private method is absent or incompatible, the override is skipped and AppKit's default safe-area behavior remains.

The resulting native window and WebKit view were both measured at 1512 × 982 points, matching the full display rather than the former 1512 × 949 content area. The frontend receives the actual screen's camera-housing exclusion rectangle; only widgets intersecting that rectangle receive a top inset. No simulated notch is drawn. Multi-display arrangements and other OS versions still require separate verification.

Research:

- [SkyLight 26.4 operation header](https://github.com/thatmarcel/macOS-26.4-headers/blob/main/headers/SkyLight/SLSBridgedMoveManagedSpaceToDisplayIndexOperation.h)
- [yabai window/space implementation](https://github.com/koekeishiya/yabai/blob/master/src/space_manager.c)
- [yabai's Mach-O lookup technique](https://github.com/koekeishiya/yabai/blob/master/src/misc/macho_dlsym.h)
- [Apple's Spaces guide](https://support.apple.com/guide/mac-help/work-in-multiple-spaces-mh14112/mac)

The test result for this Mac is recorded in `docs/Verification.md`.
