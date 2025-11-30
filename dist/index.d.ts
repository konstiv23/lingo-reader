import { InputFile, EBookParser, FileInfo } from '@lingo-reader/shared';

interface Fb2Resource {
  id: string
  // mimetyoe
  contentType: string
  // base64
  base64Data: string
}

type Fb2ResourceMap = Map<string, Fb2Resource>

interface Author {
  name: string
  firstName: string
  middleName: string
  lastName: string
  nickname?: string
  homePage?: string
  email?: string
}

// title-info
interface TitleInfo {
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
interface DocumentInfo {
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
interface PublishInfo {
  bookName?: string
  publisher?: string
  city?: string
  year?: string
  isbn?: string
}

type CustomInfo = Record<string, string>

type Fb2Metadata = Omit<TitleInfo, 'coverImageId'> & DocumentInfo & PublishInfo & CustomInfo

interface Fb2SpineItem {
  id: string
}

type Fb2Spine = Fb2SpineItem[]

interface Fb2TocItem {
  label: string
  href: string
}

type Fb2Toc = Fb2TocItem[]

interface Fb2Chapter {
  id: string
  name?: string
  sectionNode: any
}

type Fb2ChapterMap = Map<string, Fb2Chapter>

interface BodyWithName {
  name: string
  sectionNode: any
}

type Fb2RemainingBodys = BodyWithName[]

interface Fb2ResolvedHref {
  id: string
  selector: string
}

interface Fb2CssPart {
  id: string
  href: string
}

interface Fb2ProcessedChapter {
  html: string
  css: Fb2CssPart[]
}

declare function initFb2File(fb2: InputFile, resourceSaveDir?: string): Promise<Fb2File>;
declare class Fb2File implements EBookParser {
    private fb2;
    private resourceSaveDir;
    private resourceStore;
    private resourceCache;
    private chapterCache;
    private stylesheetUrl;
    private chapterStore;
    private idToChapterIdMap;
    private tableOfContent;
    getToc(): Fb2Toc;
    private spine;
    getSpine(): Fb2Spine;
    private metadata;
    getMetadata(): Fb2Metadata;
    private fileName;
    getFileInfo(): FileInfo;
    private coverImageId;
    getCoverImage(): string;
    constructor(fb2: InputFile, resourceSaveDir?: string);
    loadFb2(): Promise<void>;
    private serializeAttr;
    private serializeChildren;
    private serializeNode;
    loadChapter(id: string): Fb2ProcessedChapter | undefined;
    resolveHref(fb2Href: string): Fb2ResolvedHref | undefined;
    destroy(): void;
}

declare const HREF_PREFIX = "fb2:";
declare const ID_PREFIX = "lingo_fb2_";
declare const STYLESHEET_ID = "lingo_fb2_style";

export { Fb2File, HREF_PREFIX, ID_PREFIX, STYLESHEET_ID, initFb2File };
export type { Author, BodyWithName, CustomInfo, DocumentInfo, Fb2Chapter, Fb2ChapterMap, Fb2CssPart, Fb2Metadata, Fb2ProcessedChapter, Fb2RemainingBodys, Fb2ResolvedHref, Fb2Resource, Fb2ResourceMap, Fb2Spine, Fb2SpineItem, Fb2Toc, Fb2TocItem, PublishInfo, TitleInfo };
