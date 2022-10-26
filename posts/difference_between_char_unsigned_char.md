---
title: 小声嘟囔：char 和 unsigned char 有那么大差距吗？
publish_date: 2021-12-10
---



## 写在前面：

本篇水文记录在工作中遇到的实际问题，提醒大家写代码一定要细心。

## 起因：

A 同学：这块代码一直有警告，我试着优优化一下（试着写个八哥）～

![image.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_1.png)

点进去 UTF8String 看下定义，原来是 `const char *` 

![image20211201142559850.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_2.png)

顺手把代码中的 unsigned 删了 ：

![image20211201151203384.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_3.png)

这下警告消失了，界面干净清爽了许多～

再试试功能，未发现有任何异常，对自己这次优化十分满意！


十天后：

B同学：你最近更新代码了吗，后端发现了大量的报错日志，原来每天几十 mb 的日志，现在涨到了每天 6个G！

A同学：......

经一番排查后，发现原来是上图客户端代码中 sum 的计算结果和后端计算结果不同导致的报错。

由此终于把问题定位到了十天前删掉的 unsigned 上面。 

## 问题详解：

首先想要完全搞明白，为什么删掉了 unsigned 前后 sum 的结果会变，我们今天一起从头开始学习。

首先 我们先来调试一下这段代码：

当调用 [self dictToJsonStr:dict] 后将字典（json）转成了字符串:

`{"country":"China","city":"北京"}`

![image20211201151457610.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_4.png)

继续往下执行，调用 [jsonStr UTF8String] 后，OC 字符串变成 char *类型，此时在内存中的结构是：

![image20211201151851952.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_5.png)

如果你要问内存中第二行结尾处的 `e5 8c 97 e4 ba ac` 是什么，用 python 看下应该就明白了:
```
➜  Desktop python3
Python 3.9.6 (default, Jun 28 2021, 19:24:41)
[Clang 12.0.5 (clang-1205.0.22.9)] on darwin
Type "help", "copyright", "credits" or "license" for more information.
>>> str = '北京'
>>> print(str.encode())
b'\xe5\x8c\x97\xe4\xba\xac'
```
接着我们把断点断到 0x1041d9ad4 这行：

![image20211201153350018.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_6.png)

此时还是一切正常的，我们让循环继续执行，当 i== 27 的时候，我们来看下内存：
![image20211201154015049.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_7.png)

这个时候发现了异常，明明应该是 0x000000e5，换算十进制就是 229，但内存中是 0xffffffe5。

输入 ni 单步执行一行代码，当这次相加后，sum 的值变成了 0x89e，相比计算之前少了 27，这说明 0xffffffe5 的值是 -27。

![image20211201161443063.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_8.png)

那么我们就把  0xffffffe5 还原成 -27。



**基本知识环节：**
计算机中负数如何在内存中存储？答案就是负数在内存中以补码的形式存储。
先回忆下什么是 原码、反码，补码？
比如数字 5，在二进制中就是 0b0000 0101，那么 5 的原码就是 0b0000 0101，反码和补码就是其本身。
而数字 -5，其原码就是 0b1000 0101，最高位的 1 表示负数，0 表示正数，
反码是 0b1111 1010，除最高位外，全部取反
补码是 0b1111 1011，反码 + 1。所以数字 -5 在内存中的二进制就是 0b1111 1011。



所以还原下 0xffffffe5 的原码：

![image20211201191716954.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_9.png)

将 0xffffffe5 以二进制打印后是：`0b11111111111111111111111111100101`，那我们取取反然后 + 1 得到原码：`0b00000000000000000000000000011011`。
打印下十进制的 `0b00000000000000000000000000011011` 是多少：

![image20211201191946968.png](../difference_between_char_unsigned_char/difference_between_char_unsigned_char_10.png)

发现不太对，应该是 -27 才对啊。这是因为我们在取反的过程中把最高位的 1 取反改成了 0 ，就是说我们把这个数的符号删掉了，所以变成了 27。

现在我们知道如何将 0xffffffe5 还原成 -27 了，但是计算机为什么要将原本数据中的 0x000000e5 识别成 0xffffffe5，也就是 -27 呢？


**又是基本知识环节：**

char 和 unsigned char 都是用来定义一个字符型变量，占用一个字节，一个字节等于 8 个比特，就是 8 个二进制位。而 char 的取值范围是 -128 ~ +127，而 unsigned char 的取值范围是 0 ~ 255。

为啥 char 的取值范围是 -128 ~ +127，就是因为 char 字符占 8 位，且他是有符号的字符，最高位是用来表示正负的，除去最高位就只剩了 7 位（0b111 1111 == 127），也就最多只能存的下 127 了。

这个时候我们这个值是 0xe5，也就是 229，在内存中是 0b1110 0101，这个值是不变的，存的时候是没什么问题，但是取值的时候，因为 char 类型是有符号的原因，计算机把最高位的 1 当作了负号，这个时候取出来的值就成了 -27。没看明白的我们再计算一次：

**重点：**
内存中的 229 是 0b1110 0101，取原码（取反码再+1）后等于：0b100 11011，这就是为什么取出来是 -27 的原因～

变量如果用 unsigned char 来修饰，那么他就是无符号字符，取值范围就是 0 ~ 255，就不会出现将最高位当作符号的事故了。


## 总结：

起因就是因为在优化代码中删掉了一个小小的关键字，导致的问题。提醒我们在工作过程中一定要细心再细心，在遇到问题时，也要刨根问底完全搞清楚问题产生的原因，这样就能保证下次不再出现同样的问题。
