---
title: Mac 版本微信 QQ 防撤回
publish_date: 2008-02-06
---



本文需要用到的工具：

- hopper disassembler
- Mac版本微信QQ

我是一个刚刚接触逆向的iOS开发者，本着实践出真知的理念在网上搜索资料，开始自己动手研究。看完这篇文章您将实现Mac版本微信QQ的消息防撤回功能。

#### Mac版本微信

1.首先从App Store下载微信安装。
2.找到应用程序中的微信，右击显示包内容，找到MacOS文件夹下面的WeChat，这就是微信的可执行文件。

![微信位置.png](../WeChat_message_anti-revoke/WeChat_message_anti-revoke_1.webp)

![微信可执行文件.png](../WeChat_message_anti-revoke/WeChat_message_anti-revoke_2.webp)

3.把微信的可执行文件WeChat拷贝到桌面备用。
4.这时候要拿出我们的关键工具：hopper disassembler ，把桌面的WeChat直接拖到hopper里面进行编译。这个时候需要等待的时间可能会久一点。

5.下图是编译完成后的样子，右下角的红点working消失，表示编译完成。
![编译完成后.png](../WeChat_message_anti-revoke/WeChat_message_anti-revoke_3.webp)

6.然后在左侧的搜索栏直接查找关键函数 `onRevokeMsg`

7.这个时候开始修改汇编代码：鼠标点击函数中第一行的 `rbp`，然后按 `Option + A`，输入`ret`，并点击 `Assembler and Go Next`，此时窗口会跳到下一行，点击 `ESC` 退出即可。

![修改汇编代码.png](../WeChat_message_anti-revoke/WeChat_message_anti-revoke_4.webp)

8.此时点击 `hift + Command + E` 重新生成修改后的微信可执行文件。

9.把修改后的WeChat复制到 `/Applications/WeChat.app/Contents/MacOS` 替换原来的WeChat，并关闭微信重新打开，此时别人无法撤回你的消息。Well done!

#### Mac版本QQ

1.准备工作同上。首先从App Store下载QQ安装，去应用程序里面找到QQ，右击显示包内容，找到Contents/MacOS/QQ，把QQ复制到桌面，然后把QQ拖进hopper编译。
2.左侧搜索`handleRecallNotify`函数，鼠标点击函数中第一行的 `rbp`，然后按 `Option + A`，输入`ret`，并点击 `Assembler and Go Next`，此时窗口会跳到下一行，点击 `ESC` 退出。最后点击 `hift + Command + E` 重新生成修改后的QQ可QQ执行文件。
3.把修改后的QQ复制到 `/Applications/QQ.app/Contents/MacOS` 替换原来的QQ。重新打开QQ。