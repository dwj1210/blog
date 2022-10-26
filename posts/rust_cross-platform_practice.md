---
title: Rust 在 iOS & Android 上的跨平台实践
publish_date: 2022-02-23
---

Rust 1.0 诞生于 2015，我们点开 [Rust官网](https://www.rust-lang.org/zh-CN/) 可以看到对这门语言最贴切的形容：

> Rust - 一门赋予每个人构建可靠且高效软件能力的语言。

Rust 的特点包括 高性能、可靠性、生产力。🦀️ 的性能极高，在语言设计之初就保证了内存安全和线程安全的问题，并且拥有极其完善的构建工具、文档和清晰的错误提示。在某乎看到曾有人说过 Rust 只需要写一次，就可以稳定跑一百年。

所以我们在进行代码重构的时候，就选择了 Rust 这门年轻且优秀的语言。这也是笔者第一次使用这门语言，并尝试在 iOS、Android 上实现跨平台的实践。这篇文章将介绍如何使用 Rust 编写、构建一个跨平台库。

安装 Rust 

``` sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

在 [这里](https://doc.rust-lang.org/nightly/rustc/platform-support.html) 可以看到 Rust 支持的平台，我们安装指定架构需要的 target：

``` sh
# 查看可安装的 target 列表
rustup target list

# Android targets
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# iOS targets
rustup target add aarch64-apple-ios x86_64-apple-ios

# MacOS target
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

构建需要用到的工具：

``` sh
# 使用 cbindgen 来生成 c/c++ 的头文件
cargo install cbindgen
```

创建 rust 项目

``` sh
# 创建一个 Rust workspace
mkdir hello-rust-develop && cd hello-rust-develop && mkdir Cargo.toml 
cargo new hello-core --lib
cargo new hello-ios --lib
cargo new hello-android --lib
```

在目录下创建 Cargo.toml 文件，相当于 Rust 项目的配置文件，添加：

```
[workspace]

members = [
    "hello-core",
    "hello-ios",
    "hello-android",
]
```

## 写核心库

接下来就可以开始写下第一段 Rust 代码了：

在 hello-core/src 目录下新建 rust-add.rs 和 rust-hello.rs 文件，分别在两个文件中各添加一个函数：

``` rust
pub fn add_one(x: i32) -> i32 {
    x + 1
}
```

``` rust
pub fn hello(s: String) -> String {
    format!("Hello {s}!!!")
}
```

在 hello/lib.rs 文件中引用以上两个文件的头文件，并添加一些测试代码：

``` rust
mod rust_add;
mod rust_hello;

pub use crate::rust_add::add_one;
pub use crate::rust_hello::hello;

#[cfg(test)]
mod tests {
    use crate::{rust_add::add_one, rust_hello::hello};

    #[test]
    fn rust_add_test() {
        let sum: i32 = add_one(1);
        assert_eq!(sum, 2);

    }

    #[test]
    fn rust_hello_test() {
        let out: String = hello(String::from("rust"));
        assert_eq!(out, "Hello rust!!!");
    }
    
}
```

在 hello-core/Cargo.toml 文件中添加：

```
[lib]
name = "hello_core_lib"
path = "src/lib.rs"
```

到此为止 hello-core 已经拥有了一些核心功能，包括字符串拼接和数字计算。但是希望提供给其他平台调用的时候，还需要写绑定，比如 Java 和 C 交互需要 JNI。接下来我们就在 hello-ios 和 hello-android 中写绑定代码以供各平台调用。

## 编写 iOS 绑定代码



在 hello-ios/src/lib.rs 中写入：

``` rust
use std::ffi::{CString, CStr};
use std::os::raw::c_char;
use hello_core_lib::add_one;
use hello_core_lib::hello;

fn c_char_to_string(input: *const c_char) -> String {
    unsafe{ CStr::from_ptr(input).to_string_lossy().into_owned() }
}

#[no_mangle]
pub extern "C" fn rust_add_one_ios(input : i32) -> i32 {
    add_one(input)
}

#[no_mangle]
pub extern "C" fn rust_hello_ios(input : *const c_char) -> *const c_char {
    let result = hello(String::from(c_char_to_string(input)));
    CString::new(result).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn rust_hello_ios_release (s :*mut c_char) {
    unsafe {
        if s.is_null() {
            return;
        }
        CString::from_raw(s)
    };
}
```

在 hello-ios/Cargo.toml 中写入：

```
[lib]
name = "hello_ios"
path = "src/lib.rs"
crate_type = ["staticlib"]


[dependencies]
hello-core = { path = "../hello-core" }
```

在 /hello-ios/ 目录下执行:

``` sh
cbindgen src/lib.rs -l c > lib.h
```

将会生成一个 C 语言的头文件；内容如下：

``` c
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

int32_t rust_add_one_ios(int32_t input);

const char *rust_hello_ios(const char *input);

void rust_hello_ios_release(char *s);	
```

这个头文件就是提供给 OC 或者 Swift 来调用的。

接着执行：

``` sh
cargo build --target aarch64-apple-ios --release
```

会在 /hello-rust-develop/target/aarch64-apple-ios/release 目录下生成一个 libhello_ios.a。

## 编译 iOS framework

这个时候我们就可以用 libhello_ios.a 来文件生成 iOS 平台使用的 framework。

``` sh
cd hello-rust-develop && mkdir package-ios && cd package-ios
```

我们在这个目录下新建一个 Xcode 项目，然后把 lib.h 和 libhello_ios.a 都拖动添加到 Xcode 项目当中，结构目录应该是这样：

![image20220218165011988.png](../rust_cross-platform_practice/rust_cross-platform_practice_1.png)

修改编译的二进制类型：

![image20220218165143548.png](../rust_cross-platform_practice/rust_cross-platform_practice_2.png)

添加一个 OC 类，就叫 HelloRust，分别在 .h 和 .m 中写入：

``` oc
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface HelloRust : NSObject

- (NSString *)hello:(NSString *)input;
- (int)add:(int)input;

@end

NS_ASSUME_NONNULL_END
```

``` oc
#import "HelloRust.h"
#import "lib.h"

@implementation HelloRust

- (NSString *)hello:(NSString *)input {
    unsigned char* s = [input UTF8String];
    unsigned char *out = rust_hello_ios(s);
    NSString *result = [NSString stringWithCString:out encoding:NSUTF8StringEncoding];
    rust_hello_ios_release(out);
    return result;
}

- (int)add:(int)input {
    int result = rust_add_one_ios(input);
    return result;
}

@end
```

这部分主要是做一个类型转换，外部调用就可以直接传 OC 的类型。

添加一个对外公开的头文件，这样外部才能访问暴露的函数：

![image20220218170726698.png](../rust_cross-platform_practice/rust_cross-platform_practice_3.png)

接下来直接 Command + B 就可以进行编译了，产物就是 Products 目录下的 HelloRust.framework，这个 framework 就是我们提供给业务使用的库。接下来我们新建个 iOS 项目简单测试下：

![image20220218171127068.png](../rust_cross-platform_practice/rust_cross-platform_practice_4.png)

到此为止使用 Rust 编译 iOS 平台可用库的工作就完成了，接下来一起看下如何使 Rust 在 Android 平台工作。

## 编写 Java 绑定代码


在 /hello-android/Cargo.toml 中添加依赖和指定编译类型：

```
[lib]
name = "hello_android"
crate_type = ["cdylib"]
path = "src/lib.rs"


[dependencies]
hello-core = { path = "../hello-core" }
jni = "0.19.0"
```

在 /hello-android/src/lib.rs 写入绑定代码，主要是为了做类型转换：

``` rust
use hello_core_lib::add_one;
use hello_core_lib::hello;
use jni::objects::{JClass, JString};
use jni::sys::jstring;
use jni::JNIEnv;

#[no_mangle]
pub extern "system" fn Java_com_company_demo_Hello_hello( env: JNIEnv, _class: JClass, input: JString,) -> jstring {
    let message: String = env.get_string(input) .expect("Couldn't get java string!") .into();
    let result = hello(message);
    env.new_string(result).expect("Couldn't create java string!").into_inner()
}

#[no_mangle]
pub extern "system" fn Java_com_company_demo_Hello_add( _env: JNIEnv, _class: JClass, input: i32,) -> i32 {
    add_one(input)
}
```

然后在 /hello-android 目录下进行编译：

``` sh
cargo build --target armv7-linux-androideabi --release
```

会在 /hello-rust-develop/target/ 目录下生成供 Java 调用的 so 库文件。

## 编译 Android aar

这个时候我们使用生成的 so 文件来编译 aar。

``` sh
cd hello-rust-develop && mkdir package-android && cd package-android
```

创建一个 Android 项目之后点击 File > New > New Module... 选择 Android Library，注意包名要和上面 JNI 绑定的函数名字一致。

![image20220218181749317.png](../rust_cross-platform_practice/rust_cross-platform_practice_5.png)

将编译好的 so 库全都放到我们 Android 项目下：

``` sh
jniLibs=hello-rust-develop/package-android/MyApplication2/HelloRust/src/main/jniLibs
target_lib=hello-rust-develop/target
libName=libhello_android.so

mkdir ${jniLibs}
mkdir ${jniLibs}/arm64-v8a
mkdir ${jniLibs}/armeabi-v7a
mkdir ${jniLibs}/x86
mkdir ${jniLibs}/x86_64

# moving libraries to the android project
cp ${jniLibs}/aarch64-linux-android/release/${libName} ${jniLibs}/arm64-v8a/${libName}
cp ${jniLibs}/armv7-linux-androideabi/release/${libName} ${jniLibs}/armeabi-v7a/${libName}
cp ${jniLibs}/i686-linux-android/release/${libName} ${jniLibs}/x86/${libName}
cp ${jniLibs}/x86_64-linux-android/release/${libName} ${jniLibs}/x86_64/${libName}
```

结构如下所示（偷懒只编译了 armv7 一个架构）：

![image20220218182045838.png](../rust_cross-platform_practice/rust_cross-platform_practice_6.png)

新建 Hello 类，然后在里面加载 so 库，并声明 Native 方法就可以了。

进入 Android 项目根目录下，接着就是编译了 aar ：

``` sh
./gradlew Hello:clean
./gradlew Hello:assemble
```

在 HelloRust/build/outputs/aar 目录下就得到了编译完成的 aar 文件。

我们直接把 aar 文件拖到当前 Android 项目的 app/libs/ 下进行测试，在 app 下 build.gradle 的 dependencies 中添加依赖 

``` JAVA
implementation fileTree(dir: 'libs', include: ['*.jar', '*.aar'])
```

然后点击一下右上角的同步按钮，导入头文件，就可以正常调用了！

![image20220218183941028.png](../rust_cross-platform_practice/rust_cross-platform_practice_7.png)

## 总结

没有总结， Rust 确实很好用！
