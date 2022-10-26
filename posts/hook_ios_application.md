---

title: 如何 hook iOS 应用

publish_date: 2019-08-13

---

### 前言

相信大家在工作中会经常遇到需要 hook 的情况，比如写插件绕过越狱检测、微信自动抢红包等等。
今天我们就来分享三种 iOS 应用的 hook 方法。分别是 hook OC 方法，hook 有符号 C 函数、hook 无符号（sub_xxx） C 函数。

### hook OC 方法

hook OC 方法可以选择 `CaptainHook` 或者 `Logos` 来 hook，下面以 `CaptainHook` 来举例。

#### 实例：

```objective-c
CHDeclareClass(WXJSCoreBridge)
CHOptimizedMethod2(self, id, WXJSCoreBridge, callJSMethod, id, arg1, args, id, arg2) {

    if ([arg1 isEqualToString:@"createInstance"]) {
        
        NSString *path = [[NSBundle mainBundle] pathForResource:@"hook.txt" ofType:nil];
        NSString *codeStr = [[NSString alloc] initWithContentsOfFile:path encoding:NSUTF8StringEncoding error:nil];
        NSLog(@"%@",codeStr);
        NSMutableArray *mutArr = [NSMutableArray arrayWithCapacity:3];
        [mutArr addObjectsFromArray:arg2];
        NSString *code = [arg2 objectAtIndex:0];
        if ([code isEqualToString:@"0"]) {
            [mutArr replaceObjectAtIndex:1 withObject:codeStr];
        }
        return CHSuper2(WXJSCoreBridge, callJSMethod, arg1, args, mutArr);
    } else {
        return CHSuper2(WXJSCoreBridge, callJSMethod, arg1, args, arg2);
    }
}

CHConstructor{

    CHLoadLateClass(WXJSCoreBridge);
    CHHook2(WXJSCoreBridge, callJSMethod, args);
}
```

#### 介绍：

`CHDeclareClass` 代表要 hook 的类。
`CHOptimizedMethod2` 要 hook 的方法，数字 2 表示要 hook 的方法有两个参数。
`CHOptimizedClassMethod2` 同上，不过这个是 hook 类方法时使用的，上面的是 hook 实例方法时使用的。

### hook 有符号 C 方法

hook 有符号 C 方法可以使用 facebook 开源的 `fishhook` 框架。

#### 实例：

```objective-c
static void  (*original_printf)(const char *, ...);
void new_printf(const char *code, ...) {
    NSLog(@"hook %s",code);
}

- (void)viewDidLoad {
    [super viewDidLoad];
    rebind_symbols((struct rebinding[1]){{"printf", new_printf, (void *)&original_printf}}, 1);
    printf("success");
}
```

#### 介绍：

对于懒加载的符号表，程序会在第一次调用该函数的时候去链接动态库，然后绑定地址。`fishhook` 将指向系统方法的指针重新进行绑定指向内部自定义 C 函数，将内部函数的指针在动态链接时指向系统方法的地址，达到 hook 的目的。

### hook 无符号（sub_xxx）C 函数

相比较以上两种，hook `sub_xxx` 函数需求会少见一些。下面是使用 MSHookFunction 来 hook `sub_xxx` 无符号 C 函数。

#### 实例：

```c
void (*old_sub_10097B8A0)(const unsigned char *, unsigned char *, size_t, const void *, unsigned char* , void *);

void hook_sub_10097B8A0(const unsigned char * arg1, unsigned char * arg2, size_t arg3, const void * arg4, unsigned char* arg5, void * arg6){

    NSLog(@"AES_CBC_KEY --> %s",arg5);
    old_sub_10097B8A0(arg1, arg2, arg3, arg4, arg5, arg6);
}

%ctor
{
    @autoreleasepool
    {
        unsigned long _aes_encrypt_slide =(_dyld_get_image_vmaddr_slide(0) + 0x10097B8A0);
        MSHookFunction((void *)_aes_encrypt_slide, (void *)&hook_sub_10097B8A0, (void**)&old_sub_10097B8A0);
    }
}
```

#### 介绍：

`MSHookFunction` 可以用来 hook 带符号的 C 函数，也可以 hook 无符号 C 函数。

### 总结

在 iOS 应用逆向中学到这三种方法，以后无论对于 OC 还是 C 函数都可以轻松 hook。