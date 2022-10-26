---
title: C++ 虚函数表原理及对象内存结构分析
publish_date: 2020-03-12
---



本篇文章主要讲什么是虚函数、什么是虚函数表，以及在 C++ 中一个对象的内存布局是什么样的。

C++ 是一门面向对象的语言，跟 OC 一样有三大特性：继承、封装、多态。
C++ 中的多态是通过虚函数重写的方式来实现的。

### 从开发角度了解什么是虚函数

虚函数就是父类中由 virtual 修饰的函数。

#### 普通类：

源代码：

```c++
#include<iostream>
using namespace std;
class Base {
    
    public:
        Base():base_int(1),base_char('d'){};
        void test(){ cout<<"Base Print()"<<endl; }
    protected:
        int base_int;
        char base_char;                                   
};
int main() {
    Base b;
    return 0;
}
```



一个 Base 类，有两个成员变量分别是 base_int 和 base_char，在初始化的时候分别赋值。

调试过程：

```c++
dwj@dwj-virtual-machine:~/C++Demo$ gdb ./demo1
Reading symbols from ./demo1...done.
(gdb) b 14
Breakpoint 1 at 0x400749: file demo1.cpp, line 14.
(gdb) run
Starting program: /home/dwj/C++Demo/demo1 

Breakpoint 1, main () at demo1.cpp:14
14	    return 0;
(gdb) p b
$1 = {base_int = 1, base_char = 100 'd'}
```



通过 `p b` 命令可以查看到对象内存结构中有两个成员变量，并且已经被赋值。

#### 存在虚函数的类：

源代码：

```c++
#include<iostream>
using namespace std;
class Base {
    
    public:
        Base():base_int(1),base_char('d'){};
        virtual void test(){ cout<<"Base Print()"<<endl; }
    protected:
        int base_int;
        char base_char;                             
};
int main() {
    Base b;
    return 0;
}
```



一个 Base 类，有两个成员变量分别是 base_int 和 base_char，还有一个用 virtual 修饰的虚函数 test()。

调试过程：

```c++
dwj@dwj-virtual-machine:~/C++Demo$ gdb ./demo2 
Reading symbols from ./demo2...done.
(gdb) b 14
Breakpoint 1 at 0x400959: file demo2.cpp, line 14.
(gdb) run
Starting program: /home/dwj/C++Demo/demo2 

Breakpoint 1, main () at demo2.cpp:14
14	    return 0;
(gdb) p b
$1 = {_vptr.Base = 0x400ad8 <vtable for Base+16>, base_int = 1, base_char = 100 'd'}
(gdb) info vtbl b
vtable for 'Base' @ 0x400ad8 (subobject @ 0x7fffffffdde0):
[0]: 0x4009fe <Base::test()>
```



通过 `p b` 命令可以查看到对象内存结构中有两个成员变量，并且已经被赋值，除了这两个成员变量外，前面还有一个 Base 的虚函数指针，使用 `info vtbl b` 命令可以看到这个虚函数指针指向的内存空间是一个数组，数组中有一个元素，这个元素就是对象的 test() 虚函数指针。

#### 存在虚函数的类并且子类没有重写虚函数

源代码：

```c++
#include<iostream>
using namespace std;
class Base {
    
    public:
        Base():base_int(1),base_char('d'){};
        virtual void test(){ cout<<"Base Print()"<<endl; }
    protected:
        int base_int;
        char base_char;                             
};
class sub_Base: public Base{
    private:
    int sub_Base_int;
};
int main() {
    Base b;
    sub_Base sub_b;
    return 0;
}
```



一个 Base 类，有两个成员变量分别是 base_int 和 base_char，还有一个用 virtual 修饰的虚函数 test()。
一个 sub_Base 类继承于 Base 类，有一个自己的成员变量 sub_Base_int。

调试过程：

```c++
dwj@dwj-virtual-machine:~/C++Demo$ gdb ./demo3
Reading symbols from ./demo3...done.
(gdb) b 19
Breakpoint 1 at 0x4009b5: file demo3.cpp, line 19.
(gdb) run
Starting program: /home/dwj/C++Demo/demo3 

Breakpoint 1, main () at demo3.cpp:19
19	    return 0;
(gdb) p b
$1 = {_vptr.Base = 0x400b70 <vtable for Base+16>, base_int = 1, base_char = 100 'd'}
(gdb) p sub_b
$2 = {<Base> = {_vptr.Base = 0x400b58 <vtable for sub_Base+16>, base_int = 1, base_char = 100 'd'}, sub_Base_int = -8480}
(gdb) info vtbl b
vtable for 'Base' @ 0x400b70 (subobject @ 0x7fffffffddd0):
[0]: 0x400a4e <Base::test()>
(gdb) info vtbl sub_b
vtable for 'sub_Base' @ 0x400b58 (subobject @ 0x7fffffffdde0):
[0]: 0x400a4e <Base::test()>
```



除了和前一个 demo 调试一致的结果外，我们还发现 sub_Base 对象也有一个虚函数表指针，并且虚函数表指针指向内存空间的函数指针和父类 Base 中的虚函数表中的函数指针地址完全一致。

#### 存在虚函数的类并且子类重写虚函数

源代码：

```c++
#include<iostream>
using namespace std;
class Base {
    
    public:
        Base():base_int(1),base_char('d'){};
        virtual void test(){ cout<<"Base Print()"<<endl; }
    protected:
        int base_int;
        char base_char;                             
};
class sub_Base: public Base{
    private:
        int sub_Base_int;
    public:
        void test() { cout<<"sub_Base print()"<<endl; }
};
int main() {
    Base b;
    sub_Base sub_b;
    return 0;
}
```



一个 Base 类，有两个成员变量分别是 base_int 和 base_char，还有一个用 virtual 修饰的虚函数 test()。
一个 sub_Base 类继承于 Base 类，有一个自己的成员变量 sub_Base_int，并且重写了父类的虚函数实现。

调试过程：

```c++
dwj@dwj-virtual-machine:~/C++Demo$ gdb ./demo4
Reading symbols from ./demo4...done.
(gdb) b 21
Breakpoint 1 at 0x4009b5: file demo4.cpp, line 21.
(gdb) run
Starting program: /home/dwj/C++Demo/demo4 

Breakpoint 1, main () at demo4.cpp:21
21	    return 0;
(gdb) p b
$1 = {_vptr.Base = 0x400ba0 <vtable for Base+16>, base_int = 1, base_char = 100 'd'}
(gdb) p sub_b
$2 = {<Base> = {_vptr.Base = 0x400b88 <vtable for sub_Base+16>, base_int = 1, base_char = 100 'd'}, sub_Base_int = -8480}
(gdb) info vtbl b
vtable for 'Base' @ 0x400ba0 (subobject @ 0x7fffffffddd0):
[0]: 0x400a4e <Base::test()>
(gdb) info vtbl sub_b
vtable for 'sub_Base' @ 0x400b88 (subobject @ 0x7fffffffdde0):
[0]: 0x400a7a <sub_Base::test()>
```



在这个调试过程中我们发现 sub_Base 对象的虚函数表指针指向内存空间里的函数指针和父类 Base 中的虚函数表中的函数指针地址不再一致。

#### 结论：

C++ 类如果定义了用 virtual 修饰的虚函数，那么他的对象内存中就会存在一个 8 字节（64位）的虚函数表指针，这个指针指向一块连续的内存空间，也就是虚函数表，虚函数表是一个数组，数组中存放了类定义的虚函数指针。
如果子类继承了父类，并且父类中存在虚函数表，那么子类也会继承父类的虚函数表。当子类没有重写父类的虚函数时，子类虚函数表中保存的是父类的函数指针，当子类重写了父类的虚函数时，子类函数指针就会覆盖虚函数表中父类的函数指针。

### 从逆向看 C++ 对象内存结构

我们还是写一个 C++ demo，Base 类有两个成员变量，两个虚函数。来看看这个对象在内存中的结构：

```c++
#include <iostream>

using namespace std;
class Base {
    
    public:
    Base():base_int(10),base_char('D'){};
        virtual void testa(int arg){ cout<<"Base Print()"<< arg <<endl; }
        virtual void testb(int arg){ cout<<"Base Print()"<< arg <<endl; }
    protected:
        int base_int;
        char base_char;
};
int main(int argc, const char * argv[]) {
    Base b;
    b.testa(20);
    return 0;
}
```



断点到 b.testa(20) 这行，以下为调试过程：

```c++
(lldb) p &b
(Base *) $0 = 0x00007ffeefbff540
(lldb) x 0x00007ffeefbff540
0x7ffeefbff540: 38 20 00 00 01 00 00 00 0a 00 00 00 44 00 00 00  8 ..........D...
0x7ffeefbff550: 88 f5 bf ef fe 7f 00 00 01 00 00 00 00 00 00 00  ................
(lldb) x 0x0000000100002038
0x100002038: 50 11 00 00 01 00 00 00 d0 11 00 00 01 00 00 00  P...............
0x100002048: 60 36 99 92 ff 7f 00 00 4c 1f 00 00 01 00 00 00  `6......L.......
(lldb) b 0x0000000100001150
Breakpoint 6: where = C++Test`Base::testa(int) at main.cpp:18, address = 0x0000000100001150
(lldb) b 0x00000001000011d0
Breakpoint 7: where = C++Test`Base::testb(int) at main.cpp:19, address = 0x00000001000011d0
(lldb) po 0x0a
10

(lldb) po 0x44
68

(lldb) p char(68)
(char) $2 = 'D'
(lldb)
```



从内存结构中查看虚函数表指针：
[![img](https://dwj1210.github.io/images/vtable_1.png)](../C++_object_memory_structure_analysis_C++_object_memory_structure_analysis_1.png)

从内存结构中查看成员变量：
[![img](https://dwj1210.github.io/images/vtable_2.png)](../C++_object_memory_structure_analysis_C++_object_memory_structure_analysis_1.png)

从虚函数指针内存看对象的虚函数指针数组：
[![img](https://dwj1210.github.io/images/vtable_3.png)](../C++_object_memory_structure_analysis_C++_object_memory_structure_analysis_1.png)

对比 IDA 中反编译结果，可以证实我们拿到了 Base 类两个虚函数指针：
[![img](https://dwj1210.github.io/images/vtable_4.png)](../C++_object_memory_structure_analysis_C++_object_memory_structure_analysis_1.png)

[![img](https://dwj1210.github.io/images/vtable_5.png)](../C++_object_memory_structure_analysis_C++_object_memory_structure_analysis_1.png)