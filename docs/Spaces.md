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

Research:

- [SkyLight 26.4 operation header](https://github.com/thatmarcel/macOS-26.4-headers/blob/main/headers/SkyLight/SLSBridgedMoveManagedSpaceToDisplayIndexOperation.h)
- [yabai window/space implementation](https://github.com/koekeishiya/yabai/blob/master/src/space_manager.c)
- [yabai's Mach-O lookup technique](https://github.com/koekeishiya/yabai/blob/master/src/misc/macho_dlsym.h)
- [Apple's Spaces guide](https://support.apple.com/guide/mac-help/work-in-multiple-spaces-mh14112/mac)

The test result for this Mac is recorded in `docs/Verification.md`.
