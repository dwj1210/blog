---
title: 一次 iOS CTF 实战 WriteUp
publish_date: 2018-05-21
---



- ##### 准备

今天拿到了一道题，这里是下载地址：[Github](https://github.com/dwj1210/iOS-CTF)，首先解压缩包括一个ipa和一个deb文件。

[![Xnip2018-05-21_01-50-42](https://dwj1210.github.io/images/Xnip2018-05-21_01-50-42.jpg)](../ios_ctf_practice/ios_ctf_practice_1.jpeg)

拿到题目我一般会先干两件事，一是把Mach-O扔到IDA里面反编译。二是把ipa装到手机上跑起来。我是习惯使用MonkeyDev来安装调试的。

- ##### 开始

首先把程序跑到手机上，而这个应用也就只有一个界面。

[![main](https://dwj1210.github.io/images/IMG_1322.PNG)](../ios_ctf_practice/ios_ctf_practice_2.png)

看到这个界面的第一反应就是去找这个 `getflag` 按钮的点击事件。

[![MonkeyDev](https://dwj1210.github.io/images/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202018-05-21%20%E4%B8%8A%E5%8D%882.00.55.png)](../ios_ctf_practice/ios_ctf_practice_3.png)

点击红线处按钮使程序暂停下来，在右侧可以看到按钮在内存中的地址。之后使用lldb命令拿到按钮的点击事件 `getflag:` 。

此时找到了按钮的点击事件，那么处理输入内容是否正确的验证也一定在这里面。我们这就去IDA里面看看这个方法。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-05-07.jpg)](../ios_ctf_practice/ios_ctf_practice_4.jpeg)

下面我们就来一点一点分析这个方法。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-06-19.jpg)](../ios_ctf_practice/ios_ctf_practice_5.jpeg)

首先进入到这个方法，可以看到他从名为 `password` 的`UITextField` 里面取了输入的flag，又拿到了flag的长度，并对长度做了比较，如果长度不等于32直接跳到 `LABEL_15` 。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-10-23.jpg)](../ios_ctf_practice/ios_ctf_practice_6.jpeg)

所以我们拿到了第一条重要的信息：flag的长度一定是32。

接着继续往下分析代码。[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-12-37.jpg)](../ios_ctf_practice/ios_ctf_practice_7.jpeg)

可以看到他拿到我们输入的 `flag` 和 `plain` 属性的值分别进行了一次MD5加密，之后做了一次比较。如果两个值相等就弹框提示 `Sorry, you missed the flag!` 。

到现在，我认为我们不用着急往下继续看代码，先验证一下之前的推测。

先看一下 `viewDidLoad` 方法。发现 `plain` 是从本地文件读取出来的。我们直接找这个文件看看 `plain` 到底是什么。

![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-23-47.jpg)](../ios_ctf_practice/ios_ctf_practice_8.jpeg)

打开文件看到这个字符串以 `=` 号结尾，首先想到的是 `base64` 编码。所以直接解码拿到这段字符串 `n0_jok1ng_7hi2_real1y_n0t_fla9:(` 。

[![base64](https://dwj1210.github.io/images/Xnip2018-05-21_02-26-05.jpg)](../ios_ctf_practice/ios_ctf_practice_9.jpeg)

拿到 `plain` 的值之后回到程序，把它输入弹框中，发现确实得到了一个 `Sorry, you missed the flag!` 的提示，也验证了我们之前的分析。

好的，我们继续往下看代码。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-15-39.jpg)](../ios_ctf_practice/ios_ctf_practice_10.jpeg)

大致瞅了一眼发现先是进行了各种骚操作验证并且弹了个框提示 `Congratulation!` ，看起来这里就是验证flag是否正确的地方。

但是最开始是先判断 `self.fg` 才可以进来的，那么我们就动态调试一下看看到底能不能进这个if判断。

使用 `MonkeyDev` 编写hook代码，hook `getflag:` 方法并设置断点。在输入框中输入 `n0_jok1ng_7hi2_real1y_n0t_fla9:(` ，发现程序停下来后 `fg` 的值 为 `false` 。这就让我们十分纳闷。代码中并没有改变 `fg` 的值，但他是 `false` 的话是永远不可能进入到验证 `flag` 是否正确的函数中的。

[![Xnip2018-05-21_02-35-53](https://dwj1210.github.io/images/Xnip2018-05-21_02-35-53.jpg)](../ios_ctf_practice/ios_ctf_practice_11.jpeg)

这一筹莫展之际，我们想到了：哎。。不对啊，还有一个deb文件还没用上呢。怎么把他给忘了。

解压缩deb文件发现里面有个 `Tweak.dylib` ，先把他扔到IDA里面看看是干啥的。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-44-02.jpg)](../ios_ctf_practice/ios_ctf_practice_12.jpeg)

首先看到一个 `InitFunc` 里面使用 `MSHookMessageEx` hook了 `generate` 方法。双击 `sub_7BC8` 进去看看。[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-43-01.jpg)](../ios_ctf_practice/ios_ctf_practice_13.jpeg)

我们发现他重写了 `generate` ，而先前 `generate` 又是给 `pd` 赋值的方法，并发现 `fg` 的值也和他有关。因为之前是判断 `pd` 的值如果等于 `233333333333` 并且和 `1` 做了一次抑或，所以 `fg` 的值为 `false` ，而现在 `pd` 的值变了，所以 `fg` 也随之会变成 `true` 。这样一切都能解释的通了。

接下来我们就应该向ipa中注入动态库，最简单的办法就是把这个 `dylib` 拷贝到 `/Library/MobileSubstrate/DynamicLibraries/` 目录下，让程序运行的时候加载他。

[![Terminal](https://dwj1210.github.io/images/Xnip2018-05-21_02-54-56.jpg)](../ios_ctf_practice/ios_ctf_practice_14.jpeg)

重新运行程序，输入 `n0_jok1ng_7hi2_real1y_n0t_fla9:(` 。我们发现 `fg` 和 `pd` 都如我们预期发现了变化。

[![MonkeyDev](https://dwj1210.github.io/images/Xnip2018-05-21_02-56-51.jpg)](../ios_ctf_practice/ios_ctf_practice_15.jpeg)

接下来我们就可以好好研究验证 `flag` 的这段代码了。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-15-39%202.jpg)](../ios_ctf_practice/ios_ctf_practice_16.jpeg)

先来分析标注的这段代码，发现这 `flag` 的前16位应该和 `pd` 的前16位是相等的。

[![IDA](https://dwj1210.github.io/images/Xnip2018-05-21_02-15-39%203.jpg)](../ios_ctf_practice/ios_ctf_practice_17.jpeg)

看完这段代码，整个验证过程就很清晰明了了。接下来要做的就是写个脚本拿到16位之后的后半段 `flag` 。

下面是我用OC写的代码：[![code](https://dwj1210.github.io/images/Xnip2018-05-21_03-20-04.jpg)](../ios_ctf_practice/ios_ctf_practice_18.jpeg)

运行打印：`_3asy_23333333:)`

之后和 `pd` 的前半段相拼接。得到：`by_7he0s_ho0k_ls_3asy_23333333:)` 。

[![success](https://dwj1210.github.io/images/IMG_0015.PNG)](../ios_ctf_practice/ios_ctf_practice_19.jpeg)

拿到 `flag` 验证，发现正确，大功告成～