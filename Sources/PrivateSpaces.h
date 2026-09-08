#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
NSArray<NSDictionary *> *DSCopySpaces(void);
NSDictionary *DSRequestPinWindowSpace(unsigned int windowID);
BOOL DSIsWindowSpaceFirst(unsigned int windowID);
NS_ASSUME_NONNULL_END
