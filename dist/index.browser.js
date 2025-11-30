'use strict';

var shared = require('@lingo-reader/shared');

const HREF_PREFIX = "fb2:";
const ID_PREFIX = "lingo_fb2_";
const STYLESHEET_ID = `${ID_PREFIX}style`;

async function extractFileData(file) {
  if (file instanceof Uint8Array) {
    return {
      data: file,
      fileName: ""
    };
  }
  {
    if (typeof file === "string") {
      throw new TypeError("The `fb2` param cannot be a `string` in browser env.");
    }
    return {
      data: await file.text(),
      fileName: file.name
    };
  }
}
function getFirstXmlNodeText(xmlNode) {
  return xmlNode?.[0]._ ?? "";
}
function extend(target, source, ignoreKeys = []) {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key) && !(key in target)) {
      if (!ignoreKeys.includes(key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
}
function base64ToUint8Array(base64String) {
  const binaryString = atob(base64String.trim());
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function saveResource(resource, resourceSaveDir) {
  const { id, base64Data, contentType } = resource;
  {
    const resourceUint8 = base64ToUint8Array(base64Data);
    const blob = new Blob([resourceUint8], { type: contentType });
    return URL.createObjectURL(blob);
  }
}
function saveStylesheet(style, resourceSaveDir) {
  {
    return URL.createObjectURL(new Blob([style], { type: "text/css" }));
  }
}
function buildFb2Href(chapterId, fb2GlobalId) {
  return HREF_PREFIX + chapterId + (fb2GlobalId ? `#${fb2GlobalId}` : "");
}
function buildIdToSectionMap(sectionId, sectionNode, idToChapterMap) {
  for (const node of sectionNode.children) {
    if (node["#name"] === "__text__") {
      continue;
    }
    const $ = node.$;
    if ($ && $.id) {
      idToChapterMap.set($.id, sectionId);
    }
    if (node.children) {
      buildIdToSectionMap(sectionId, node, idToChapterMap);
    }
  }
}
const fb2TagToHtmlTagMap = {
  "section": "div",
  "title": "h2",
  "subtitle": "h3",
  "poem": "blockquote",
  "stanza": "p",
  "v": "p",
  "text-author": "cite",
  "epigraph": "blockquote",
  "empty-line": "br",
  "image": "img",
  "emphasis": "em"
};
const selfClosingHtmlTag = /* @__PURE__ */ new Set([
  "br",
  "img"
]);
function transformTagName(tag) {
  const transtormedTag = fb2TagToHtmlTagMap[tag] ?? tag;
  return {
    tag: transtormedTag,
    isSelfClosing: selfClosingHtmlTag.has(transtormedTag)
  };
}

function parseBinary(binaryAST) {
  const resourceMap = /* @__PURE__ */ new Map();
  for (const binary of binaryAST ?? []) {
    const $ = binary.$;
    const id = $.id;
    const contentType = $["content-type"];
    if (!id || !contentType) {
      throw new Error("The <binary> element must have `id` and `content-type` attributes.");
    }
    resourceMap.set(id, {
      id,
      contentType: $["content-type"],
      base64Data: binary._
    });
  }
  return resourceMap;
}
function parseAuthor(authorAST) {
  const firstName = getFirstXmlNodeText(authorAST["first-name"]);
  const middleName = getFirstXmlNodeText(authorAST["middle-name"]);
  const lastName = getFirstXmlNodeText(authorAST["last-name"]);
  const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
  return {
    firstName,
    middleName,
    lastName,
    name,
    nickname: getFirstXmlNodeText(authorAST["first-name"]),
    homePage: getFirstXmlNodeText(authorAST["home-page"]),
    email: getFirstXmlNodeText(authorAST.email)
  };
}
function parseCoverpage(coverpageAST) {
  const $ = coverpageAST.image[0].$;
  return $["l:href"] ?? $["xlink:href"];
}
function parseTitleInfo(titleInfoAST) {
  const titleInfo = {};
  const directMapFields = {
    "genre": "type",
    "lang": "language",
    "annotation": "description",
    "book-title": "title",
    "src-lang": "srcLang"
  };
  for (const key in titleInfoAST) {
    const node = titleInfoAST[key]?.[0];
    if (key in directMapFields && node && "_" in node) {
      titleInfo[directMapFields[key]] = node._;
      continue;
    }
    switch (key) {
      case "author": {
        titleInfo.author = parseAuthor(node);
        break;
      }
      case "coverpage": {
        titleInfo.coverImageId = parseCoverpage(node).slice(1);
        break;
      }
    }
  }
  return titleInfo;
}
function parseDocumentInfo(documentInfoAST) {
  const documentInfo = {};
  for (const key in documentInfoAST) {
    if (key === "children") {
      continue;
    } else if (key === "author") {
      documentInfo.author = parseAuthor(documentInfoAST.author[0]);
    } else if (key === "history") {
      documentInfo.history = documentInfoAST.history[0];
    } else {
      documentInfo[shared.camelCase(key)] = getFirstXmlNodeText(documentInfoAST[key]);
    }
  }
  return documentInfo;
}
function parsePublishInfo(publishInfoAST) {
  const publishInfo = {};
  for (const key in publishInfoAST) {
    if (key === "children") {
      continue;
    }
    const node = publishInfoAST[key];
    publishInfo[shared.camelCase(key)] = getFirstXmlNodeText(node);
  }
  return publishInfo;
}
function parseCustomInfo(customInfoAST) {
  const res = {};
  for (const customInfo of customInfoAST) {
    const infoType = customInfo.$["info-type"];
    res[infoType] = customInfo._;
  }
  return res;
}
function parseDescription(descriptionAST) {
  const metadata = {};
  let coverImageId = "";
  let history;
  if (descriptionAST["title-info"]) {
    const titleInfo = parseTitleInfo(descriptionAST["title-info"][0]);
    coverImageId = titleInfo.coverImageId ?? "";
    extend(metadata, titleInfo, ["coverImageId"]);
  }
  if (descriptionAST["document-info"]) {
    const documentInfo = parseDocumentInfo(descriptionAST["document-info"][0]);
    extend(metadata, documentInfo, ["history"]);
    history = documentInfo.history;
  }
  if (descriptionAST["publish-info"]) {
    const publishInfo = parsePublishInfo(descriptionAST["publish-info"][0]);
    extend(metadata, publishInfo);
  }
  if (descriptionAST["custom-info"]) {
    const customInfo = parseCustomInfo(descriptionAST["custom-info"]);
    extend(metadata, customInfo);
  }
  return {
    metadata,
    coverImageId,
    history
  };
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
async function initFb2File(fb2, resourceSaveDir = "./images") {
  const fb2Instance = new Fb2File(fb2, resourceSaveDir);
  await fb2Instance.loadFb2();
  return fb2Instance;
}
class Fb2File {
  constructor(fb2, resourceSaveDir = "./images") {
    this.fb2 = fb2;
    // resource
    __publicField(this, "resourceSaveDir");
    // global id to Resource
    __publicField(this, "resourceStore");
    // id to url
    __publicField(this, "resourceCache", /* @__PURE__ */ new Map());
    // chapter id to processed chapter
    __publicField(this, "chapterCache", /* @__PURE__ */ new Map());
    // stylesheet Url
    __publicField(this, "stylesheetUrl", "");
    // chapters
    __publicField(this, "chapterStore", /* @__PURE__ */ new Map());
    __publicField(this, "idToChapterIdMap", /* @__PURE__ */ new Map());
    // Toc
    __publicField(this, "tableOfContent", []);
    // spine
    __publicField(this, "spine", []);
    __publicField(this, "metadata");
    __publicField(this, "fileName");
    __publicField(this, "coverImageId");
    this.resourceSaveDir = resourceSaveDir;
  }
  getToc() {
    return this.tableOfContent;
  }
  getSpine() {
    return this.spine;
  }
  getMetadata() {
    return this.metadata;
  }
  getFileInfo() {
    return {
      fileName: this.fileName
    };
  }
  getCoverImage() {
    if (this.resourceCache.has(this.coverImageId)) {
      return this.resourceCache.get(this.coverImageId);
    }
    if (this.coverImageId.length > 0 && this.resourceStore.has(this.coverImageId)) {
      const resourcePath = saveResource(
        this.resourceStore.get(this.coverImageId),
        this.resourceSaveDir
      );
      this.resourceCache.set(this.coverImageId, resourcePath);
      return resourcePath;
    }
    return "";
  }
  async loadFb2() {
    const { data: fb2Uint8Array, fileName } = await extractFileData(this.fb2);
    this.fileName = fileName;
    const res = await shared.parsexml(fb2Uint8Array, {
      charsAsChildren: true,
      preserveChildrenOrder: true,
      explicitChildren: true,
      childkey: "children",
      trim: true
    });
    const fictionBook = res.FictionBook;
    this.resourceStore = parseBinary(fictionBook.binary);
    const { metadata, coverImageId, history } = parseDescription(fictionBook.description[0]);
    this.metadata = metadata;
    this.coverImageId = coverImageId;
    if (history) {
      this.metadata.history = this.serializeNode(history);
    }
    if (fictionBook.stylesheet) {
      this.stylesheetUrl = saveStylesheet(fictionBook.stylesheet[0]._, this.resourceSaveDir);
      this.resourceCache.set(STYLESHEET_ID, this.stylesheetUrl);
    }
    let sectionId = 0;
    for (const body of fictionBook.body) {
      const isUnnamedBody = !body.$?.name;
      for (const sectionNode of body.section) {
        const id = ID_PREFIX + sectionId;
        const name = isUnnamedBody ? getFirstXmlNodeText(sectionNode.title) : body.$.name;
        this.chapterStore.set(id, {
          id,
          sectionNode,
          ...isUnnamedBody ? {} : { name }
        });
        this.spine.push({ id });
        this.tableOfContent.push({
          label: name,
          href: buildFb2Href(id)
        });
        buildIdToSectionMap(id, sectionNode, this.idToChapterIdMap);
        sectionId++;
      }
    }
  }
  serializeAttr(attrs, tagName) {
    if (!attrs) {
      return "";
    }
    const res = [];
    for (const key in attrs) {
      const value = attrs[key];
      if (key === "l:href" || key === "xlink:href") {
        const id = value.slice(1);
        if (tagName === "a" && this.idToChapterIdMap.has(id)) {
          res.push(`href="${buildFb2Href(
            this.idToChapterIdMap.get(id),
            id
          )}"`);
        } else if (tagName === "a" && value.startsWith("http")) {
          res.push(`href="${value}"`);
        } else if (tagName === "img" && this.resourceStore.has(id)) {
          const resourceUrl = saveResource(
            this.resourceStore.get(id),
            this.resourceSaveDir
          );
          this.resourceCache.set(id, resourceUrl);
          res.push(`src="${resourceUrl}"`);
        } else {
          res.push("");
        }
      } else {
        res.push(`${key}="${value}"`);
      }
    }
    return res.filter(Boolean).join(" ");
  }
  serializeChildren(sectionNode) {
    const res = [];
    for (const node of sectionNode.children) {
      if (node["#name"] === "__text__") {
        res.push(node._);
      } else {
        const { tag, isSelfClosing } = transformTagName(node["#name"]);
        const attrStr = this.serializeAttr(node.$, tag);
        const targetAttrStr = attrStr.length > 0 ? ` ${attrStr}` : "";
        let childrenStr = "";
        if (node.children) {
          childrenStr = this.serializeChildren(node);
        }
        res.push(
          isSelfClosing ? `<${tag}${targetAttrStr}/>` : `<${tag}${targetAttrStr}>${childrenStr}</${tag}>`
        );
      }
    }
    return res.join("");
  }
  serializeNode(sectionNode) {
    const attrStr = this.serializeAttr(sectionNode.$, "div");
    const childrenStr = this.serializeChildren(sectionNode);
    return `<div${attrStr}>${childrenStr}</div>`;
  }
  loadChapter(id) {
    if (!this.chapterStore.has(id)) {
      return void 0;
    }
    if (this.chapterCache.has(id)) {
      return this.chapterCache.get(id);
    }
    const chapter = this.chapterStore.get(id);
    const transformedSection = {
      html: this.serializeNode(chapter.sectionNode),
      css: this.stylesheetUrl.length > 0 ? [{ id: `${ID_PREFIX}css`, href: this.stylesheetUrl }] : []
    };
    this.chapterCache.set(id, transformedSection);
    return transformedSection;
  }
  resolveHref(fb2Href) {
    if (!fb2Href.startsWith(HREF_PREFIX)) {
      return void 0;
    }
    fb2Href = fb2Href.slice(HREF_PREFIX.length).trim();
    const [chapterId, globalId] = fb2Href.split("#");
    const id = this.chapterStore.get(chapterId)?.id;
    if (!id) {
      return void 0;
    }
    let selector = "";
    if (globalId) {
      selector = `[id="${globalId}"]`;
    }
    return {
      id,
      selector
    };
  }
  destroy() {
    this.resourceCache.forEach((path) => {
      {
        URL.revokeObjectURL(path);
      }
    });
    this.resourceCache.clear();
    this.chapterCache.clear();
    this.resourceStore?.clear();
    this.chapterStore.clear();
  }
}

exports.HREF_PREFIX = HREF_PREFIX;
exports.ID_PREFIX = ID_PREFIX;
exports.STYLESHEET_ID = STYLESHEET_ID;
exports.initFb2File = initFb2File;
