<h1 align="center"><a href="https://github.com/hhk-png/lingo-reader">Home Page</a></h1>

The FB2 format parser is based on references from [MobileRead Wiki - FB2](https://wiki.mobileread.com/wiki/FB2) and [Eng:FictionBook description — FictionBook](http://www.fictionbook.org/index.php/Eng:FictionBook_description).

# Overview

`@lingo-reader/fb2-parser` is a parser for `.fb2` eBook files, designed to work in both browser and Node.js environments.

# Installation

```shell
pnpm install @lingo-reader/fb2-parser
```

# Fb2File

## Usage in the Browser

```typescript
import { initFb2File } from '@lingo-reader/fb2-parser'
import type { Fb2File, Fb2Spine } from '@lingo-reader/fb2-parser'

async function initFb2(file: File) {
  const fb2: Fb2File = await initFb2File(file)
  // Get the spine (chapter list)
  const spine: Fb2Spine = fb2.getSpine()
  // Load the first chapter
  const firstChapter = fb2.loadChapter(spine[0].id)
}

// See the Fb2File class for more API details
```

## Usage in Node.js

```typescript
import { initFb2File } from '@lingo-reader/fb2-parser'
import type { Fb2File, Fb2Spine } from '@lingo-reader/fb2-parser'

const fb2: Fb2File = await initFb2File('./example/many-languages.fb2')
// Get the spine (chapter list)
const spine: Fb2Spine = fb2.getSpine()
// Load the first chapter
const firstChapter = fb2.loadChapter(spine[0].id)

// See the Fb2File class for more API details
```

## initFb2File(file: string | File | Uint8Array, resourceSaveDir?: string): Promise

Initializes and parses an FB2 file. It returns an `Fb2File` object containing metadata, spine info, and other helper APIs.

**Parameters:**

- `file: string | File | Uint8Array` – The FB2 file to load. Can be a file path (Node), `File` object (Browser), or `Uint8Array` (both).
- `resourceSaveDir?: string` – Optional. Used in Node.js to specify where to save resources like images. Defaults to `./images`.

**Returns:**

- `Promise<Fb2File>` – A promise that resolves to the parsed `Fb2File` instance.

**Note:**
In the browser, `file` must be of type `File` or `Uint8Array`.
In Node.js, `file` must be of type `string` or `Uint8Array`. Passing the wrong type will result in an error.

## Mobi Class

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
  // FB2 file name including extension
  fileName: string
}
```

Returns basic file information. Currently, only the `fileName` is provided.

### getSpine(): Fb2Spine

```typescript
interface Fb2SpineItem {
  id: string // Chapter ID
}
type Fb2Spine = Fb2SpineItem[]
```

Returns an ordered list of chapters (the "spine"). Each item includes an `id` that can be passed to `loadChapter` to load that chapter.

### loadChapter(id: string): Fb2ProcessedChapter | undefined

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

Loads and processes a chapter by its ID. Returns a structured object containing `html` and `css`. Returns `undefined` if the chapter doesn't exist.

The stylesheet is extracted from `FictionBook.stylesheet` and shared across all chapters. When loading a chapter, the styles are stored as an object in `Fb2ProcessedChapter.css`. The `id` is fixed, while the `href` is a Blob URL in browser environments and a real file path in Node environments.

The original chapter files are stored in XML format, so converting them to HTML involves transforming both tags and resource paths. The only resources in the chapters are images, and their URLs are automatically converted in the final returned HTML.

Another element that gets transformed is the `<a>` tag used for internal navigation. The `href` attribute of these tags is automatically rewritten to a specific format. You can use `fb2.resolveHref` to parse the rewritten link and extract the corresponding chapter ID and DOM selector.

### getToc(): Fb2Toc

```typescript
interface Fb2TocItem {
  label: string // TOC item label
  href: string // Internal FB2 href
}
export type Fb2Toc = Fb2TocItem[]
```

Returns the table of contents. Each item has a label and internal `href`. Fb2Toc is not nested.

### getCoverImage(): string

Returns the book's cover image. In the browser, it's a blob URL. In Node.js, it's a file path. If the FB2 file doesn't contain a `CoverImage`, an empty string is returned.

### getMetadata(): MobiMetadata

```typescript
interface Author {
  name: string // Full name
  firstName: string
  middleName: string
  lastName: string
  nickname?: string
  homePage?: string
  email?: string
}

interface MobiMetadata {
  // title-info
  title?: string
  type?: string
  author?: Author
  language?: string
  description?: string
  keywords?: string
  date?: string
  srcLang?: string // Source language if translated
  translator?: string

  // document-info
  id?: string
  programUsed?: string // Program used to generate the FB2 file
  srcUrl?: string // Original source URL of the content
  srcOcr?: string // OCR tool or indicator that OCR was used
  version?: string
  history?: string

  // publish-info
  bookName?: string
  publisher?: string
  city?: string
  year?: string
  isbn?: string
}
```

Returns the book’s metadata.

### resolveHref(href: string): Fb2ResolvedHref | undefined

```typescript
interface Fb2ResolvedHref {
  id: string // Chapter ID
  selector: string // DOM selector (usable with querySelector)
}
```

Resolves internal FB2 `href` values (e.g., from `<a>` tags) into a chapter ID and a DOM selector for the in-document anchor.

### destroy(): void

Cleans up any created blob URLs or saved resources, to avoid memory leaks during parsing and rendering.
