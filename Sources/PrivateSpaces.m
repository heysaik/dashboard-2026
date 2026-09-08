#import "PrivateSpaces.h"
#import <dlfcn.h>
#import <mach-o/dyld.h>
#import <mach-o/loader.h>
#import <mach-o/nlist.h>
#import <objc/message.h>
#import <objc/runtime.h>

// Runtime-only SPI. No addresses or OS-build offsets are hardcoded. The symbol
// table technique and operation were researched against yabai and SkyLight's
// 26.4 headers; see docs/Spaces.md for sources and compatibility limits.
static const char *libraryPath = "/System/Library/PrivateFrameworks/SkyLight.framework/Versions/A/SkyLight";
static void *library;
static int (*connection)(void);
static CFArrayRef (*copyManaged)(int);
static CFArrayRef (*copyWindowSpaces)(int, int, CFArrayRef);
static int64_t (*performOperation)(id);
static void (*moveSpace)(int, uint64_t, CFStringRef, unsigned int);

static void *localSymbol(const char *name) {
    for (uint32_t i = 0; i < _dyld_image_count(); i++) {
        const char *path = _dyld_get_image_name(i);
        if (!path || strcmp(path, libraryPath)) continue;
        const struct mach_header_64 *header = (const void *)_dyld_get_image_header(i);
        if (header->magic != MH_MAGIC_64) return NULL;
        const struct symtab_command *table = NULL;
        const struct segment_command_64 *linkedit = NULL;
        const uint8_t *cursor = (const uint8_t *)(header + 1);
        const uint8_t *end = cursor + header->sizeofcmds;
        for (uint32_t j = 0; j < header->ncmds && cursor + sizeof(struct load_command) <= end; j++) {
            const struct load_command *command = (const void *)cursor;
            if (command->cmdsize < sizeof(*command) || cursor + command->cmdsize > end) return NULL;
            if (command->cmd == LC_SYMTAB) table = (const void *)command;
            if (command->cmd == LC_SEGMENT_64 && !strcmp(((const struct segment_command_64 *)command)->segname, SEG_LINKEDIT)) linkedit = (const void *)command;
            cursor += command->cmdsize;
        }
        if (!table || !linkedit) return NULL;
        intptr_t slide = _dyld_get_image_vmaddr_slide(i);
        uintptr_t base = linkedit->vmaddr - linkedit->fileoff + slide;
        const struct nlist_64 *entries = (const void *)(base + table->symoff);
        const char *strings = (const void *)(base + table->stroff);
        for (uint32_t j = 0; j < table->nsyms; j++) {
            uint32_t offset = entries[j].n_un.n_strx;
            if (offset < table->strsize && entries[j].n_value && !strcmp(strings + offset, name)) return (void *)(entries[j].n_value + slide);
        }
    }
    return NULL;
}

static void loadSPI(void) {
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        library = dlopen(libraryPath, RTLD_LAZY | RTLD_LOCAL);
        if (!library) return;
        connection = dlsym(library, "SLSMainConnectionID");
        copyManaged = dlsym(library, "SLSCopyManagedDisplaySpaces");
        copyWindowSpaces = dlsym(library, "SLSCopySpacesForWindows");
        moveSpace = dlsym(library, "SLSMoveManagedSpaceToDisplayIndex");
        performOperation = localSymbol("__ZL54SLSPerformAsynchronousBridgedWindowManagementOperationP47SLSAsynchronousBridgedWindowManagementOperation");
    });
}

NSArray<NSDictionary *> *DSCopySpaces(void) {
    loadSPI();
    if (!connection || !copyManaged) return @[];
    return CFBridgingRelease(copyManaged(connection())) ?: @[];
}

static NSDictionary *windowSpace(unsigned int windowID) {
    loadSPI();
    if (!connection || !copyWindowSpaces) return nil;
    NSArray *ids = CFBridgingRelease(copyWindowSpaces(connection(), 7, (__bridge CFArrayRef)@[@(windowID)]));
    for (NSDictionary *display in DSCopySpaces()) {
        NSArray *spaces = display[@"Spaces"];
        for (NSUInteger index = 0; index < spaces.count; index++) {
            NSDictionary *space = spaces[index]; NSNumber *sid = space[@"ManagedSpaceID"] ?: space[@"id64"];
            if ([ids containsObject:sid]) return @{@"space": sid, @"index": @(index), @"display": display[@"Display Identifier"] ?: @"Main", @"type": space[@"type"] ?: @0};
        }
    }
    return nil;
}

NSDictionary *DSRequestPinWindowSpace(unsigned int windowID) {
    NSDictionary *target = windowSpace(windowID);
    if (!target) return @{@"requested": @NO, @"message": @"Dashboard’s Space is not ready. Enter full screen, then try again."};
    if ([target[@"type"] intValue] == 0) return @{@"requested": @NO, @"message": @"Enter Dashboard’s full-screen Space before pinning. Regular desktop Spaces are left in place."};
    if ([target[@"index"] unsignedIntegerValue] == 0) return @{@"requested": @YES, @"alreadyFirst": @YES, @"message": @"Dashboard is the leftmost Space."};
    uint64_t sid = [target[@"space"] unsignedLongLongValue];
    Class operationClass = NSClassFromString(@"SLSBridgedMoveManagedSpaceToDisplayIndexOperation");
    SEL selector = NSSelectorFromString(@"initWithSpaceID:displayIdentifier:index:");
    @try {
        if (performOperation && operationClass && [operationClass instancesRespondToSelector:selector]) {
            id allocated = [operationClass alloc];
            id operation = ((id (*)(id, SEL, uint64_t, id, unsigned int))objc_msgSend)(allocated, selector, sid, target[@"display"], 0);
            if (!operation) return @{@"requested": @NO, @"message": @"macOS could not create the Space operation."};
            performOperation(operation);
            return @{@"requested": @YES, @"method": @"SkyLight bridged operation", @"space": @(sid), @"message": @"Checking whether macOS moved Dashboard to the left…"};
        }
        if (moveSpace) {
            moveSpace(connection(), sid, (__bridge CFStringRef)target[@"display"], 0);
            return @{@"requested": @YES, @"method": @"SkyLight legacy operation", @"space": @(sid), @"message": @"Checking whether macOS moved Dashboard to the left…"};
        }
    } @catch (NSException *exception) {
        return @{@"requested": @NO, @"message": @"The private Space operation is not supported by this version of macOS."};
    }
    return @{@"requested": @NO, @"message": @"Space reordering is unavailable on this macOS build. Use Mission Control to place Dashboard on the left."};
}

BOOL DSIsWindowSpaceFirst(unsigned int windowID) {
    NSDictionary *target = windowSpace(windowID);
    return target && [target[@"index"] unsignedIntegerValue] == 0;
}
