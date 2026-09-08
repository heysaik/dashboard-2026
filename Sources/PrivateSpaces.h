#import <Foundation/Foundation.h>
BOOL DSAllowFullDisplayContent(void);

NS_ASSUME_NONNULL_BEGIN
NSArray<NSDictionary *> *DSCopySpaces(void);
NSDictionary *DSRequestPinWindowSpace(unsigned int windowID);
BOOL DSIsWindowSpaceFirst(unsigned int windowID);
NS_ASSUME_NONNULL_END
