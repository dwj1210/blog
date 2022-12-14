---
title: AES 加密算法
publish_date: 2008-04-16
---



密钥是AES算法实现加密和解密的根本。对称加密算法之所以对称，是因为这类算法对明文的加密和解密需要使用同一个密钥

#### AES加密时需要统一的几个参数

```
密钥长度（Key Size）
工作模式（Cipher Mode）
填充方式（Padding）
初始向量（Initialization Vector）
```

#### 密钥长度

AES支持三种长度的密钥：128位，192位，256位。

平时大家所说的AES128，AES192，AES256，实际上就是指的AES算法对不同长度密钥的使用。

#### 工作模式

工作模式要解决的问题即明文数据流怎样按分组大小切分，数据不对齐的情况怎么处理等等。

AES加密算法提供了五种不同的工作模式：

- ###### 电子密码本：Electronic Code Book Mode (ECB)

  ECB模式只是将明文按分组大小切分，然后用同样的密钥正常加密切分好的明文分组。ECB的理想应用场景是短数据（如加密密钥）的加密。此模式的问题是无法隐藏原明文数据的模式，因为同样的明文分组加密得到的密文也是一样的。

- ###### 密码分组链接：Cipher Block Chaining Mode (CBC)

  此模式是1976年由IBM所发明，引入了IV（初始化向量：Initialization Vector）的概念。IV是长度为分组大小的一组随机，通常情况下不用保密，不过在大多数情况下，针对同一密钥不应多次使用同一组IV。 CBC要求第一个分组的明文在加密运算前先与IV进行异或；从第二组开始，所有的明文先与前一分组加密后的密文进行异或。CBC模式相比ECB实现了更好的模式隐藏，但因为其将密文引入运算，加解密操作无法并行操作。同时引入的IV向量，还需要加、解密双方共同知晓方可。

- ###### 密文反馈：Cipher Feedback Mode (CFB)

  与CBC模式类似，但不同的地方在于，CFB模式先生成密码流字典，然后用密码字典与明文进行异或操作并最终生成密文。后一分组的密码字典的生成需要前一分组的密文参与运算。CFB模式是用分组算法实现流算法，明文数据不需要按分组大小对齐。

- ###### 输出反馈：Output Feedback Mode (OFB)

  OFB模式与CFB模式不同的地方是：生成字典的时候会采用明文参与运算，CFB采用的是密文。

- ###### 计数器模式：Counter Mode (CTR)

  CTR模式同样会产生流密码字典，但同是会引入一个计数，以保证任意长时间均不会产生重复输出。CTR模式只需要实现加密算法以生成字典，明文数据与之异或后得到密文，反之便是解密过程。CTR模式可以采用并行算法处理以提升吞量，另外加密数据块的访问可以是随机的，与前后上下文无关。

#### 填充方式

要想了解填充的概念，我们先要了解AES的分组加密特性。AES算法在对明文加密的时候，并不是把整个明文一股脑加密成一整段密文，而是把明文拆分成一个个独立的明文块，每一个铭文块长度128bit。这些明文块经过AES加密器的复杂处理，生成一个个独立的密文块，这些密文块拼接在一起，就是最终的AES加密结果。假如一段明文长度是196bit，如果按每128bit一个明文块来拆分的话，第二个明文块只有64bit，不足128bit。这时候怎么办呢？就需要对明文块进行填充（Padding）。

常见的三种填充方式：

- ###### NoPadding

  不做任何填充，但是要求明文必须是16字节的整数倍。

- ###### PKCS5Padding（默认）

  如果明文块少于16个字节（128bit），在明文块末尾补足相应数量的字符，且每个字节的值等于缺少的字符数。 比如明文：{1,2,3,4,5,a,b,c,d,e},缺少6个字节，则补全为{1,2,3,4,5,a,b,c,d,e,6,6,6,6,6,6 }

- ###### ISO10126Padding

  如果明文块少于16个字节（128bit），在明文块末尾补足相应数量的字节，最后一个字符值等于缺少的字符数，其他字符填充随机数。比如明文：{1,2,3,4,5,a,b,c,d,e},缺少6个字节，则可能补全为{1,2,3,4,5,a,b,c,d,e,5,c,3,G,$,6}

#### 初始向量

初始向量IV(Initialization Vector)，使用除ECB以外的其他加密模式均需要传入一个初始向量，其大小与块大小相等，AES块大小是128bit，所以Iv的长度是16字节，初始向量可以加强算法强度。

不同的IV加密后的字符串是不同的，加密和解密需要相同的IV，既然IV看起来和key一样，却还要多一个IV的目的，对于每个块来说，key是不变的，但是只有第一个块的IV是用户提供的，其他块IV都是自动生成。
IV的长度为16字节。超过或者不足，可能实现的库都会进行补齐或截断。但是由于块的长度是16字节，所以一般可以认为需要的IV是16字节。