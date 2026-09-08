#import "DictionarySources.h"
#import <CoreServices/CoreServices.h>
#import <dlfcn.h>

typedef CFArrayRef (*CopyDictionaries)(void);
typedef CFStringRef (*DictionaryName)(DCSDictionaryRef);

// DictionaryServices exposes lookup publicly but enumeration only through SPI.
// Resolve it at runtime and retain the public default lookup as a fallback.
static NSArray *AvailableDictionaries(void) {
    CopyDictionaries copy = (CopyDictionaries)dlsym(RTLD_DEFAULT, "DCSCopyAvailableDictionaries");
    return copy ? CFBridgingRelease(copy()) ?: @[] : @[];
}
static NSString *NameOfDictionary(id dictionary) {
    DictionaryName name = (DictionaryName)dlsym(RTLD_DEFAULT, "DCSGetDictionaryName");
    return name ? (__bridge NSString *)name((__bridge DCSDictionaryRef)dictionary) ?: @"" : @"";
}
NSArray<NSDictionary<NSString *, NSString *> *> *DSDictionarySources(void) {
    NSMutableArray *sources = [NSMutableArray arrayWithObject:@{@"id": @"", @"name": @"Dictionary"}];
    for (id dictionary in AvailableDictionaries()) {
        NSString *name = NameOfDictionary(dictionary);
        if (name.length) [sources addObject:@{@"id": name, @"name": name}];
    }
    return sources;
}
NSString *DSDefinition(NSString *word, NSString *source) {
    DCSDictionaryRef chosen = NULL;
    NSArray *dictionaries = AvailableDictionaries();
    if (source.length) {
        for (id dictionary in dictionaries) {
            if ([NameOfDictionary(dictionary) isEqualToString:source]) { chosen = (__bridge DCSDictionaryRef)dictionary; break; }
        }
        if (!chosen) return @"This dictionary is not installed. Choose another source or enable it in Dictionary settings.";
    }
    CFStringRef result = DCSCopyTextDefinition(chosen, (__bridge CFStringRef)word, CFRangeMake(0, word.length));
    return CFBridgingRelease(result) ?: @"No entry found. Try another word or dictionary.";
}
