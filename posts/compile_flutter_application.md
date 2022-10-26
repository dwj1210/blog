---
title: Flutter 应用编译模式
publish_date: 2020-03-03
---


## 写在前面

为什么会有这篇博客？是因为在应用安全测试中遇到了一个纯 Flutter 开发的应用，因为之前对 Flutter 了解较少，所以开始从 Flutter 环境搭建到写一个 Flutter Demo 开始学习 Flutter 应用。

## Flutter

- Flutter 是谷歌的移动 UI 框架，可以快速在 iOS 和 Android 上构建高质量的原生用户界面。（更多的时候 Flutter 会被当作一种跨平台开发方案使用）
- Flutter 可以与现有的代码一起工作。

开源地址：https://github.com/flutter/flutter

Flutter 采用 Dart 语言开发，Dart 也是谷歌开发的计算机编程语言。

### Flutter & Dart 编译模式

- Dart 的编译模式：
  - JIT（Just In Time 即时编译）
    - Script：在 PC 命令行调用 dart vm 执行 dart 源代码文件即是这种模式
    - Script Snapshot：和上一个不同的是，这里载入的是已经 token 化的 dart 源代码，提前执行了上一步的 lexer 步骤
    - Application Snapshot：这种模式来源于 dart vm 直接载入源码后 dump 出数据。dart vm 通过这种数据启动会更快。不过值得一提的是这种模式是区分架构的
  - AOT（Ahead Of Time 事前编译）
    - 直接将 dart 源码编译出 .S 文件，然后通过汇编器生成对应架构的代码。
- Flutter 的编译模式：
  - JIT
    - Script：和 Dart 的 Script 模式一样，但是没有开启使用
    - Script Snapshot：也是和 Dart 的 Script Snapshot 模式一样，也没有开启使用
    - Kernel Snapshot：Dart 的 bytecode 模式，在某种程度上类似 JVM。在 Flutter 项目中也被叫做 Core Snapshot，它是和设备架构无关的
  - AOT
    - Core JIT: 一种编译后的二进制格式，程序的数据和指令被打包成特殊的二进制，在运行时加载。事实上Core JIT 也被叫做 AOT Blobs, 是 AOT 的一种
    - AOT Assembly: 和 Dart 的 AOT 模式一样

### Debug 环境中的 Flutter

在开发阶段，执行 flutter run 命令就可以将 Flutter App 跑起来，Flutter 也提供了例如：r（Hot reload）、R（Hot restart）等命令来进行界面、代码等热更新功能。为了方便 UI 快速成型，同时也需要比较高的性能来进行视图渲染，所以 Flutter 在 Debug 下使用了 Kernel Snapshot 编译模式，会生成如下产物：

[![debug](https://dwj1210.github.io/images/Flutter_1.png)](https://dwj1210.github.io/images/Flutter_1.png)

1. isolate_snapshot_data: 加速 isolate 启动的数据，和业务无关
2. vm_snapshot_data: 加速 Dart VM 启动的数据，和业务无关
3. kernel_blob.bin: 业务代码产物

```sh
➜  my_app flutter run
Launching lib/main.dart on iPhone in debug mode...

Found saved certificate choice "iPhone Developer: xxx@163.com
(F9CZLE42Q8)". To clear, use "flutter config".
Signing iOS app for device deployment using developer identity: "iPhone
Developer: xxx@163.com (F9CZLE42Q8)"
Running Xcode build...

 └─Compiling, linking and signing...                        14.6s
Xcode build done.                                           20.6s

Installing and launching...                                        27.8s
Syncing files to device iPhone...                                  206ms

Flutter run key commands.
r Hot reload. 🔥🔥🔥
R Hot restart.
h Repeat this help message.
d Detach (terminate "flutter run" but leave application running).
c Clear the screen
q Quit (terminate the application on the device).
An Observatory debugger and profiler on iPhone is available at:
http://localhost:1024
```

| 项目/平台    | Android              | iOS                  |
| :----------- | :------------------- | :------------------- |
| 代码环境     | debug                | debug                |
| 编译模式     | Kernel Snapshot      | Kernel Snapshot      |
| 打包工具     | dart vm（2.0）       | dart vm（2.0）       |
| Flutter 命令 | flutter build bundle | flutter build bundle |
| 打包产物     | flutter_assets/*     | flutter_assets/*     |

### Release 环境中的 Flutter

在生产阶段，应用需要的是非常快的速度，所以 Android 和 iOS 毫无意外地都选择了 AOT 打包。不过由于平台特性不同，打包模式也是天壤之别。

| 项目/平台    | Android           | Android(–build-shared-library)          | iOS                    |
| :----------- | :---------------- | :-------------------------------------- | :--------------------- |
| 代码环境     | release           | release                                 | release                |
| 编译模式     | Core JIT          | AOT Assembly                            | AOT Assembly           |
| 打包工具     | gen_snapshot      | gen_snapshot                            | gen_snapshot           |
| Flutter 命令 | flutter build aot | flutter build aot –build-shared-library | flutter build aot –ios |
| 打包产物     | flutter_assets/*  | app.so                                  | App.framework          |

App Store 审核条例不允许动态下发可执行二进制代码，所以 iOS 平台采用了 AOT Assembly 的编译模式。

而 Android release 模式下支持两种编译模式：Core JIT 和 AOT Assembly 。
在 Android 的 Core JIT 打包中生成的产物有四个：
isolate_snapshot_data,、vm_snapshot_data、 isolate_snapshot_instr,、vm_snapshot_instr。
我们不认识的产物只有 2个：isolate_snapshot_instr和 vm_snapshot_instr，其实它俩代表着 vm 和 isolate 启动后所承载的指令等数据。

Android 的 AOT Assembly 打包方式则是安卓共享库的形式，并且该处代码需要从 JNI 调用，远不如 Core JIT 的 Java API 方便。所以 Android 上默认使用 Core JIT 打包，而不是 AOT Assembly。

### 总结

iOS 平台中 Flutter 分别在 debug 和 release 两种模式下分别用了 JIT 和 AOT 编译模式。

在 iOS Release 环境中 Flutter 相关代码的最终产物是 App.framework（由 Dart 代码生成）和 Flutter.framework（引擎和嵌入器）。
[![release](https://dwj1210.github.io/images/Flutter_2.png)](https://dwj1210.github.io/images/Flutter_2.png)

App.framework 与 Flutter.framework 不同，App.framework 是原生机器码，与 AOT 模式中的 Dart 代码对应，而在 JIT 模式下，App.framework 只有几个简单的 API，Dart 代码存在于 snapshot_blob.bin 文件中。这部分代码的快照是带有简单标记的源代码的脚本快照。所有的注释和空格字符都被移除，常量被规格化，不存在机器代码、摇树优化或代码混淆。

实际上，使用 Flutter 开发的 iOS 或 Android 项目仍然是标准的 iOS 或 Android 项目。iOS 端 Flutter 通过在 BuildPhase 中添加 shell 来生成并嵌入 App.framework 和 Flutter.framework。
[![Xcode](https://dwj1210.github.io/images/Flutter_3.png)](https://dwj1210.github.io/images/Flutter_3.png)

对应脚本目录：
`~/flutter/packages/flutter_tools/bin/xcode_backend.sh`
加载动态库、签名动态库、错误输出等功能。

Android 中则通过 gradle 来添加 flutter.jar 和 vm/isolate_snapshot_data/instr(Android) 来将 Flutter 相关代码编译和嵌入原生 App 而已。

所以这也是为什么闲鱼同时使用了 RN、Flutter 等多个跨平台框架的原因。

## 参考资料

https://flutterchina.club/
https://proandroiddev.com/flutters-compilation-patterns-24e139d14177?gi=44afeb587bd5