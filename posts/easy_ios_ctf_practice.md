---
title: 记一次简单的 iOS CTF 练习题
publish_date: 2008-04-16
---

#### 何为CTF：

 夺旗（CTF）是一项计算机安全竞赛。CTF竞赛通常旨在作为一种教育活动，为参与者提供固定机器的经验，以及对现实世界中发现的这类攻击进行反应。逆向工程，网络嗅探，协议分析，系统管理，编程和密码分析都是DEF CT先前的CTF竞赛所需的技能。有两种主要的比赛形式：攻击/防守和危险。（wikipage中的定义）

#### 参考地址：

 这次的iOS CTF的练习题是我在[Ivan R Blog](https://www.ivrodriguez.com/mobile-ctf/)中找到的，针对于初学者的iOS CTF。 [这里](http://www.google.com/)是ipa文件的下载地址，而[这里](https://ctf.ivrodriguez.com/)则是提交并检验找到的flag是否正确的地方。

#### 版本详情：

下载的ipa包含两个版本：Headbook-v1.0 和 Headbook-v2.0

Headbook-v1.0 找到了五个flag

Headbook-v2.0 找到了三个flag

#### Headbook-v1.0：

- ##### 第一个flag

解压下载的ipa，然后打开.app文件找到Mach-O拖到IDA里面分析。

[![bundle目录](https://dwj1210.github.io/images/image2.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_1.png)

在 `[AppDelegate applicationWillTerminate:]` 中发现有一句输出打印。此时把ipa装手机运行之后，双击home键上划，触发`applicationWillTerminate` 方法，发现打印出来falg： `flag-9861DA53-C08C-47C4-84D6-B48463AB738A` 。

[![applicationWillTerminate](https://dwj1210.github.io/images/image1.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_2.png)

拿到flag去提交验证发现正确，大功告成。

- ##### 第二个flag

反编译完成的IDA左侧是 `Function Windoow` ，在这里我们可以看到一些很奇怪的方法名称，但是却和我们的flag很相似，所以试着把这几个奇怪的方法名由上到下拼到一起，看能不能得到flag。

[![Function Window](https://dwj1210.github.io/images/image14.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_3.png)

拿到flag，验证正确～ `flag-BD570736-D304-400A-A6B7-F61B02173428`

- ##### 第三个flag

在二进制文件中苦苦寻觅并没有得到什么有效的线索，该换个思路去别的地方找找了。这个时候我们去本地文件里面看一下，打开bundle目录下的plist文件，结果立马发现了一个新鲜flag。 `flag-EC840814-CEBA-4731-8620-CB991D850B14`

[![info.plist](https://dwj1210.github.io/images/image15.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_4.png)

- ##### 第四个flag

从plist文件中找到了一个flag，所以会不会在资源文件里也会有呢，带着猜想我们试试解压资源文件 `Assets.car` ，不知道该用什么工具解压的同学[点这里](https://github.com/insidegui/AssetCatalogTinkerer/raw/master/releases/AssetCatalogTinkerer_latest.zip)。

解压文件以后惊喜的发现flag居然藏在了图片里面。

[![flag_Normal@3x](https://dwj1210.github.io/images/image16.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_5.png)

在这里不得不佩服作者的思路。

- ##### 第五个flag

乘胜追击，看看bundle目录下还有哪里可能藏着我们要找的flag。

[![Main.storyboardc](https://dwj1210.github.io/images/image17.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_7.png)

使用[ATOM](https://atom.io/)打开 `Main.storyboardc` 文件，直接搜索flag。
[![ATOM](https://dwj1210.github.io/images/image18.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_8.png)

这样我们便找到了第五个flag `flag-5932744F-4810-4A6C-BD8F-66FF3E115ED6` ，至此圆满完成。

总结：

Headbook-v1.0只是一个练手的题目很简单，但是我们不得不佩服作者的思路，同时也对CTF题目有了更深刻的认识，集巧妙趣味于一身，让人深深被其吸引。

#### Headbook-v2.0：

- ##### 第一个flag

同样解压下载的ipa，然后打开.app文件找到Mach-O拖到IDA里面分析。

[![bundle目录](https://dwj1210.github.io/images/image9.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_9.png)

 直接把ipa运行在手机上发现直接打印出了一句话： `Good thing this flag is encrypted: Ov630qDn5AbOWX4JIUUeurVdgNdsjqiaM8ywYCT2Yj1eiMcT/MEPJJ5W9icdC5qb`

 在IDA中查看发现这句话是在 `[AppDelegate application:didFinishLaunchingWithOptions:]` 中打印的。

[![application:didFinishLaunchingWithOptions](https://dwj1210.github.io/images/image4.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_10.png)

 这不明摆着告诉我们：这个flag是个好东西，并且他被加密了。

 接下来我们就要去寻找解密方法了，直接在IDA中搜索 `decrypt` ，直接找到了 `[AppDelegate decryptText:]` 方法。很明显这是一个解密方法，但是不确定是不是我们要找的，所以我们就验证一下。

 这里我使用了[MonkeyDev](https://github.com/AloneMonkey/MonkeyDev)来编写hook代码，验证我们的猜想。

[![CaptainHook](https://dwj1210.github.io/images/image5.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_11.png)

 运行代码，就在控制台打印出了： `AppDelegate-decryptText:flag-71F5243A-A55D-4E97-893A-8C3C4B34A938` ， 此时现在这个flag跟版本1中flag的结构一致，所以我们就直接提交flag验证发现猜想正确。

- ##### 第二个flag

在主界面中点击 `Enter` 可以进入到第二个界面，发现名为 `DownloadViewController` ，顾名思义是个负责下载的控制器了。[![CaptainHook](../easy_ios_ctf_practice/easy_ios_ctf_practice_12.png)

查看 `ViewDidLoad`方法发现该控制器初始化了一个 `DownloadTask` ，并且调用了 `[DownloadTask start]` 方法。

[![DownloadTask](https://dwj1210.github.io/images/image7.png)](https://dwj1210.github.io/images/image7.png)[![DownloadTask](https://dwj1210.github.io/images/image8.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_13.png)

 看到这个方法，第一时间想到去本地找下载的文件，但是并没有找到。然后我的做法是hook了 `[NSURL URLWithString:]` 方法，拿到了下载文件的地址 `https://ctf.ivrodriguez.com/analytics` ，其实在IDA中也完全可以看到。

 把地址直接粘贴到浏览器发现下载了一个txt文件，打开txt文件就找到了第二个flag： `flag-4056CEF3-DCCB-4D9B-9D0E-64428E9A50E3` 。

- ##### 第三个flag

这个ipa文件方法并不多，我们挨个查看寻找线索，发现了一个 `[TextHandler mainFunc]` 方法。

[![TextHandler mainFunc](https://dwj1210.github.io/images/image3.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_14.png)
[![TextHandler mainFunc](https://dwj1210.github.io/images/image10.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_15.png)
[![TextHandler mainFunc](https://dwj1210.github.io/images/image13.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_16.png)

我是使用Monkeydev编写代码主动调用，并且打印出来 `[TextHandler mainFunc]` 的返回值。

[![CaptainHook](https://dwj1210.github.io/images/image11.png)](../easy_ios_ctf_practice/easy_ios_ctf_practice_17.png)

运行程序此时打印出来： `TextHandler-mainFunc:flag-F72ECAE7-0BBE-4D1D-BF49-3B75BD6F9DCA`。

拿到flag提交验证，我们就找到了第三个flag。