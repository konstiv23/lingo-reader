export interface Fb2Resource {
  id: string
  // mimetyoe
  contentType: string
  // base64
  base64Data: string
}

export type Fb2ResourceMap = Map<string, Fb2Resource>

export interface Author {
  name: string
  firstName: string
  middleName: string
  lastName: string
  nickname?: string
  homePage?: string
  email?: string
}

// title-info
export interface TitleInfo {
  // alias of book-title
  title?: string
  // alias of genre
  type?: string
  author?: Author
  // alias of lang
  language?: string
  // alias of annotation
  description?: string
  keywords?: string
  // date that the book was written
  date?: string
  srcLang?: string
  translator?: string
  coverImageId?: string
}

// document-info
export interface DocumentInfo {
  author?: Author
  // alias of id
  id?: string
  programUsed?: string
  srcUrl?: string
  srcOcr?: string
  version?: string
  // html, need to format node
  history?: string
  date?: string
}

// publish-info
export interface PublishInfo {
  bookName?: string
  publisher?: string
  city?: string
  year?: string
  isbn?: string
}

export type CustomInfo = Record<string, string>

export type Fb2Metadata = Omit<TitleInfo, 'coverImageId'> & DocumentInfo & PublishInfo & CustomInfo

export interface Fb2SpineItem {
  id: string
}

export type Fb2Spine = Fb2SpineItem[]

export interface Fb2TocItem {
  label: string
  href: string
}

export type Fb2Toc = Fb2TocItem[]

export interface Fb2Chapter {
  id: string
  name?: string
  sectionNode: any
}

export type Fb2ChapterMap = Map<string, Fb2Chapter>

export interface BodyWithName {
  name: string
  sectionNode: any
}

export type Fb2RemainingBodys = BodyWithName[]

export interface Fb2ResolvedHref {
  id: string
  selector: string
}

export interface Fb2CssPart {
  id: string
  href: string
}

export interface Fb2ProcessedChapter {
  html: string
  css: Fb2CssPart[]
}
