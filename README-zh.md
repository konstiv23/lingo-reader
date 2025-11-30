<h1 align="center">
  <a href="https://github.com/hhk-png/lingo-reader">Home Page</a>&nbsp;&nbsp;&nbsp;
</h1>

fb2 格式的解析参考了 [MobileRead Wiki - FB2](https://wiki.mobileread.com/wiki/FB2) 与 [Eng:FictionBook description — FictionBook](http://www.fictionbook.org/index.php/Eng:FictionBook_description) 。

# 简介

`@lingo-reader/fb2-parser` 用于在浏览器和 node 环境下解析 `.fb2` 电子书文件。

# Install

```shell
pnpm install @lingo-reader/fb2-parser
```

# Fb2File

## Usage in browser

```typescript
import { initFb2File } from '@lingo-reader/fb2-parser'
import type { Fb2File, Fb2Spine } from '@lingo-reader/fb2-parser'

function initFb2(file: File) {
  const fb2: Fb2File = await initFb2File(file)
  // spine
  const spine: Fb2Spine = fb2.getSpine()
  // loadChapter
  const firstChapter = fb2.loadChapter(spine[0].id)
}

// see Fb2File class
// .....
```

## Usage in node

```typescript
import { initFb2File } from '@lingo-reader/fb2-parser'
import type { Fb2File, Fb2Spine } from '@lingo-reader/fb2-parser'

const fb2: Fb2File = await initFb2File('./example/many-languages.fb2')
// spine
const spine: Fb2Spine = fb2.getSpine()
// loadChapter
const firstChapter = fb2.loadChapter(spine[0].id)

// see Fb2File class
// .....
```

## initFb2File(file: string | File |Uint8Array, resourceSaveDir?: string): Promise\<Fb2File\>

用于初始化 fb2 文件的 API。将文件路径、文件的 File 对象或者 Uint8Array 输入其中后，就可以得到一个 Fb2File 对象，包括读取元信息、Spine 的各种信息的 API。

**参数：**

- `file: string | File | Uint8Array`：文件路径或者文件的 File 对象，`Uint8Array`。
- `resourceSaveDir?: string`：可选参数，主要应用在 node 环境下，为图片等资源的保存路径。默认为 `./images`

**返回值：**

- `Promise<Fb2File>`：初始化后的 Fb2 对象，为一个 Promise。

**Note:** 对于 `file` 参数，浏览器端其类型应为 `File | Uint8Array`，不能传入`string` 类型。nodejs 端其类型应该为 `string | Uint8Array`，不能传入 `File` 类型。否则会报错。

## Mobi class

```typescript
class Mobi {
  getFileInfo(): FileInfo
  getSpine(): Fb2Spine
  loadChapter(id: string): Fb2ProcessedChapter | undefined
  getToc(): Fb2Toc
  getCoverImage(): string
  getMetadata(): Fb2Metadata
  resolveHref(fb2Href: string): Fb2ResolvedHref | undefined
  destroy(): void
}
```

### getFileInfo(): FileInfo

```typescript
interface MobiFileInfo {
  // fb2文件名，包括文件后缀
  fileName: string
}
```

获取一些文件信息，目前只有 `fileName` 字段。

### getSpine(): Fb2Spine

```typescript
interface Fb2SpineItem {
  // chapter id
  id: string
}
type Fb2Spine = Fb2SpineItem[]
```

spine 中列出了所有需要按顺序显示的章节文件，spine 内每一个对象存储章节的 id，将 id 传入 loadChapter 用于加载对应的章节。

### loadChapter(id: string): Fb2ProcessedChapter| undefined

```typescript
interface Fb2CssPart {
  id: string
  href: string
}
interface Fb2ProcessedChapter {
  html: string
  css: Fb2CssPart[]
}
```

`loadChapter` 的参数是章节的 id，返回值为处理后的章节对象。如果返回值为 `undefined`，说明没有该章节。

fb2 文件的 css 存放在 FictionBook.stylesheet 下，整个书籍文件只有一个 stylesheet。因此如果 fb2 文件中有样式字段，则其会被读取出来保存。使用 loadChapter 加载章节时，会以对象的形式存放到 Fb2ProcessedChapter.css 中，其 id 固定，href 在浏览器环境下为 bloburl，在 node 环境下为真实的文件路径。

原始的章节文件以 xml 形式存放，因此在转换为 html 的过程中涉及到标签与资源路径的转换。章节中的资源只有图片，在最终返回的 html 中，会自动转换图片的资源链接。另一个是用于内部跳转的 a 标签，a 标签的 href 属性会自动转换为特定的 href 链接，使用 fb2.resolveHref 可以解析出该链接所对应的章节 id 和 dom 选择器。

### getToc(): Fb2Toc

```typescript
interface Fb2TocItem {
  // toc item label
  label: string
  // fb2内部的href
  href: string
}
export type Fb2Toc = Fb2TocItem[]
```

用于获取书籍的目录。Fb2Toc 中没有 children。

### getCoverImage(): string

获取书籍的封面图片，以 blob url 的形式给出。在 node 环境下为文件路径。返回空字符串时，代表 `CoverImage` 不存在。

### getMetadata(): MobiMetadata

```typescript
interface Author {
  // firstName + middleName + lastName
  name: string
  firstName: string
  middleName: string
  lastName: string
  // 作者昵称
  nickname?: string
  // 作者主页
  homePage?: string
  // 作者邮箱
  email?: string
}

interface MobiMetadata {
  // title-info
  // 书名
  title?: string
  // 书籍类型
  type?: string
  // 作者信息
  author?: Author
  // 书籍所使用的语言
  language?: string
  description?: string
  keywords?: string
  // date that the book was written
  date?: string
  // 如果是翻译的书籍，srcLang指的是未被翻译时的书籍的语言
  srcLang?: string
  // 译者
  translator?: string

  // document-info
  id?: string
  // 使用何种程序生成的fb2文件
  programUsed?: string
  // 原始文本的来源地址
  srcUrl?: string
  // 标记该文本是否来源于 OCR（光学字符识别），或记录 OCR 工具信息
  srcOcr?: string
  version?: string
  // 改动历史
  history?: string

  // publish-info
  // 书名
  bookName?: string
  // fb2文件的发布者
  publisher?: string
  // 发布城市与年份
  city?: string
  year?: string
  isbn?: string
}
```

获取元数据。

### resolveHref(href: string): MobiResolvedHref | undefined

```typescript
interface Fb2ResolvedHref {
  // 章节的id
  id: string
  // 章节html中的dom选择器，可直接被document.querySelector接收
  selector: string
}
```

用于解析指向其他章节的链接，被处理成上面的形式。

### destroy(): void

清除解析文件过程中所创建的 blob url 和保存的资源，防止内存泄漏。
