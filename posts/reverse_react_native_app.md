---
title: 如何逆向 React Native 应用
publish_date: 2019-12-10
---



在工作或者兴趣研究中，我们经常会遇到一些带有签名字段或者是加密后的数据包。

而数据的加密，是为了保证数据在链路传输过程中即便被中间人攻击，也无法获取到明文的用户信息。签名字段则是为了保证数据传输的完整性，保证数据不会被中间人篡改。

今天就拿一个简单的 RN 应用来分享下，对于 RN 应用如何逆向出数据包的签名字段算法。

### 抓包

[![Snipaste_2019-12-09_17-24-22](https://dwj1210.github.io/images/Snipaste_2019-12-09_17-24-22.png)](../reverse_react_native_app/reverse_react_native_app_1.png)

可以看到 “sign” 字段应就是签名字段。

### 逆向

#### 0x00

我们先用 IDA 反编译一下二进制，然后尝试搜索下 “trParam” 字符串发现并没有我们需要的结果。

#### 0x01

然后用 lldb 挂上应用看下视图发现，应用视图类使用了大量 RCTxxx 。

[![Snipaste_2019-12-09_17-19-58](https://dwj1210.github.io/images/Snipaste_2019-12-09_17-19-58.png)](../reverse_react_native_app/reverse_react_native_app_2.png)

由此可以推断出应用使用了 React Native 混合开发模式。而 RN 应用的主要逻辑代码均为 js 实现。

#### 0x02

解压缩安装包，进入 .app 目录，可以找到应用的 js 源代码，应该就是这个文件。

[![Snipaste_2019-12-09_17-53-36](https://dwj1210.github.io/images/Snipaste_2019-12-09_17-53-36.png)](../reverse_react_native_app/reverse_react_native_app_3.png)

打开查看 jsbundle 的代码发现全部经过了压缩混淆，可读性为 0。

[![Snipaste_2019-12-09_16-57-35](https://dwj1210.github.io/images/Snipaste_2019-12-09_16-57-35.png)](../reverse_react_native_app/reverse_react_native_app_4.png)

#### 0x03

这个时候我们需要一个 [js 在线格式化](https://tool.oschina.net/codeformat/js) 帮我们格式化一下 js 代码。虽然变量名字和函数名都经过了无意义的混淆，但是经过格式化后的代码还是有很强的可读性。

#### 0x04

在 js 代码中搜索数据包中的字符串发现可以直接定位到字段拼接的位置。

[![Snipaste_2019-12-09_18-07-50](https://dwj1210.github.io/images/Snipaste_2019-12-09_18-07-50.png)](../reverse_react_native_app/reverse_react_native_app_5.png)

从代码片段中可以看到 timestamp 是一个时间戳，nonce 是一个随机数，而 sign 则是由 nonce 拼接 timestamp 最后 md5 后的结果。

[![Snipaste_2019-12-09_18-08-08](https://dwj1210.github.io/images/Snipaste_2019-12-09_18-08-08.png)](../reverse_react_native_app/reverse_react_native_app_6.png)

在这里可以看到 trParam 是对传入的变量 e md5 后的结果。但是我们并不知道这个 e 代表什么。

#### 0x05

我们尝试在 js 代码中添加 console.log 来打印关键信息，但是发现日志并没有输出到日志中。

另起思路，给 JSContext 类添加方法来通过 js 调用 OC 方法来打印。

```
#import <JavaScriptCore/JavaScriptCore.h>
CHDeclareClass(JSContext)
CHOptimizedMethod0(self, id, JSContext, init) {

    self = CHSuper0(JSContext, init);
    self[@"NSLog"] = ^(NSString *format){
        NSLog(@"%@",format);
    };
    return self;
}

CHConstructor{

    CHLoadLateClass(JSContext);
    CHClassHook0(JSContext, init);
}
```

如果你发现你的代码报错了，可能是忘记在 hook 代码中导入头文件。

实际插入的代码：

[![Snipaste_2019-12-09_18-20-00](https://dwj1210.github.io/images/Snipaste_2019-12-09_18-20-00.png)](../reverse_react_native_app/reverse_react_native_app_7.png)

#### 0x06

我们使用 MonKeyDev 重打包安装到手机，在实际运行过程中就能在控制台看到相应的日志输出了。

而此处的变量 e 其实就是用户手机号经过 AES 加密之后的数据，而 trParam 则是手机号经过 AES 然后 md5 后的数据了。该部分就不在展示了。

### 总结

对于 RN 应用确实存在无法动态调试 js 代码的问题。但是我们可以通过插入 log 的方式动态追踪关键函数的入参和返回值。