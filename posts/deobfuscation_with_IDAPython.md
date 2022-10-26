---
title: 从手撕花指令混淆到 IDAPython 脚本
publish_date: 2020-09-07
---

## 写在前面

在安卓防护发展到第五代甚至第六代加壳之后，大家对于 iOS 应用的防护也越来越重视，从一开始 iOS 应用的裸奔，到现在通过检测运行环境，字符串、函数名混淆，控制流混淆，花指令混淆等等各种手段来保护应用代码，今天我们就通过一个例子来分析下如何去花指令混淆，并编写 IDAPython 脚本进行 patch

##  手动分析花指令混淆

IDA 不能正常反汇编代码，全部是一堆莫名的十六进制字符，而伪代码则是只有一句 JUMPOUT()，完全看不到伪代码，甚至看不到正常的汇编代码

汇编代码：
[![img](https://dwj1210.github.io/images/idapython_1.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_1.png)
伪代码：
[![img](https://dwj1210.github.io/images/idapython_2.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_2.png)

首先我们就先来动态调试一下这段代码，看下到底是什么。
首先我们对 `+[RPSDK start:rpCompleted:withVC:]` 方法下断点，然后使用 frida 主动调用下这个方法
[![img](https://dwj1210.github.io/images/idapython_3.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_3.png)

接着此时我们可以看到 LLDB 调试器断点触发，然后我们在 BR X21 这行汇编代码再下一个断点，看看 X21 的值是多少
[![img](https://dwj1210.github.io/images/idapython_4.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_4.png)

输入命令 c 使程序继续执行，并暂停到 BR X21，打印 X21 的值
[![img](https://dwj1210.github.io/images/idapython_5.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_5.png)

暂且不关心这个 X21 的值是怎么算出来的，我们通过打印可以发现 X21 的值是五行汇编之后的一个地址，所以 BR X21 则是跳到了 0x105308510 这行汇编，输入 si 命令，应用执行到 0x105308510

接着来思考下为什么应用在动态执行过程中，可以还原正常的汇编代码，而 IDA 反汇编器却无法正常反汇编呢？
既然从汇编层面得不到解释，就从更深一层找找原因，首先来打印下此时应用 PC 指针的内存，PC 指针指向的是当前运行的汇编地址，通过打印 PC 指针指向的内存可以看到此时应用执行的机器码
[![img](https://dwj1210.github.io/images/idapython_6.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_6.png)

```
(lldb) x/16bx $pc
0x105308510: 0x5b 0x08 0x80 0x52 0xfb 0x03 0x00 0xb9
0x105308518: 0x29 0x00 0x00 0x10 0x3a 0x01 0x00 0x98
```

接下来在 IDA 中查看汇编的机器码
在 Options - General - Number of opcode bytes 中输入 16，并点击 OK
[![img](https://dwj1210.github.io/images/idapython_7.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_7.png)

然后通过比较发现在这一串莫名的十六进制字符，原来就是应用的机器码
[![img](https://dwj1210.github.io/images/idapython_8.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_8.png)

由此我们猜测，可能是由于 IDA 无法正常识别某些机器码，所以也就无法正常反汇编代码，导致应用正常逻辑的汇编代码被隐藏起来了
既然这些机器码无法被 IDA 正常识别，且应用执行过程中也并不会执行这些代码，所以我就手动把这些无法被识别的机器码 patch 成 1F 20 03 D5，也就是汇编代码的 NOP
[![img](https://dwj1210.github.io/images/idapython_9.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_9.png)

在完成 patch 那些不能别正确识别的机器码后，我们按 C 键，惊喜的发现已经可以正常反汇编成汇编代码了
[![img](https://dwj1210.github.io/images/idapython_10.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_10.png)

接下来我们断点到 BR X9，并查看 X9 的值
[![img](https://dwj1210.github.io/images/idapython_11.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_11.png)

发现 X9 的值也就是之后的第六行汇编的地址，接下来就把 BR X9 后面的五行汇编代码 patch 成 NOP，并按 C 键转成代码
[![img](https://dwj1210.github.io/images/idapython_12.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_12.png)

接下来以此类推，将该方法中所有不可以被正确识别的机器码 patch 成 NOP，并转成汇编代码，最后 点击该方法最后一行代码点 E 键，修改方法的结尾，这样就可以恢复出该方法完整正常的汇编代码了
接着我们按 F5 发现伪代码依然是
[![img](https://dwj1210.github.io/images/idapython_13.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_13.png)

这是因为代码中存在 BR X21 这样的跳转汇编，IDA 在静态分析中并不知道这个 X21 的地址是多少，所以认为是跳出了当前方法，伪代码依然是 JUMPOUT()
接下来我们可以通过查看 X21 的计算逻辑来 patch 这行汇编，使其是跳转到一个地址，而不是一个寄存器值的地址
而偷懒的办法是结合前面的动态调试分析发现所有的 `BR 寄存器` 语句，都是跳转到之后的第六条汇编指令执行
[![img](https://dwj1210.github.io/images/idapython_14.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_14.png)

发现规律之后，就可以将 `BR 寄存器` 的机器码 patch 成 `06 00 00 14`，这条机器码的意思就是跳转到当前地址之后的第六条汇编语句的地址，其中 14 代表的是汇编指令 B，而 06 代表往后跳转多少条汇编语句，比如当前地址是 `0x100A3BE7C`，当前机器码为 `06 00 00 14`，那么当前汇编语句伪代码即 `B loc_100A3BE94`，他是如何计算出来的呢？就是 0x100A3BE7C + 0x6 * 4

在把全部的 `BR 寄存器`，patch 完成后
[![img](https://dwj1210.github.io/images/idapython_15.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_15.png)

按 F5 查看伪代码
[![img](https://dwj1210.github.io/images/idapython_16.png)](../deobfuscation_with_IDAPython/deobfuscation_with_IDAPython_16.png)
此时我们完成了花指令混淆 patch 的整个过程

## IDAPython 脚本

手动 patch 一个方法已经很累了，更别说手动 patch 几十个方法，所以在我们完成分析之后，就可以编写 IDAPython 脚本来进行自动的 patch 工作

整个思路就是，我们输入一个地址，脚本会往后循环遍历一百行进行检索
当检索到机器码为 `xx xx 1F D6`，且上一条汇编语句的指令为 `MOV` 或者 `STR`，则将当前地址机器码 patch 为 `06 00 00 14`，将后面五条汇编语句 patch 为 `1F 20 03 D5`
通过 idc.Byte() 函数来获取机器码，idc.PrevHead() 函数获取上一条汇编代码，GetMnem() 函数来获取汇编指令

```python
def ida_patch(baseAddr):
    i = 1
    while i <= 100:
        if idc.Byte(baseAddr+2) == 0x1F and idc.Byte(baseAddr+3) == 0xD6 and (GetMnem(idc.PrevHead(baseAddr)) == "MOV" or GetMnem(idc.PrevHead(baseAddr)) == "STR"):
            print(hex(idc.Byte(baseAddr+0)), hex(idc.Byte(baseAddr+1)), hex(idc.Byte(baseAddr+2)), hex(idc.Byte(baseAddr+3)))
            idc.PatchByte(baseAddr, 0x06)
            idc.PatchByte(baseAddr+1, 0x00)
            idc.PatchByte(baseAddr+2, 0x00)
            idc.PatchByte(baseAddr+3, 0x14)
            j = 4
            while j <= 23:
                idc.PatchByte(baseAddr+j, 0x1F)
                idc.PatchByte(baseAddr+j+1, 0x20)
                idc.PatchByte(baseAddr+j+2, 0x03)
                idc.PatchByte(baseAddr+j+3, 0xD5)
                j += 4
        baseAddr += 4
        i += 1
```



到此为止我们就完成了从手撕花指令混淆到 IDAPython 脚本的整个过程，去花指令混淆的思路就是通过观察花指令的规律并进行相应的 patch

## 参考学习

https://armconverter.com/
https://unit42.paloaltonetworks.com/?search_field=idapython&pg=1#all