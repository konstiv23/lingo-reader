import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { writeFileSync } from 'node:fs'
import type { InputFile } from 'packages/shared'
import type { Fb2Resource } from './types'
import { HREF_PREFIX, STYLESHEET_ID } from './constant'

export async function extractFileData(file: InputFile) {
  if (file instanceof Uint8Array) {
    return {
      data: file,
      fileName: '',
    }
  }

  if (__BROWSER__) {
    if (typeof file === 'string') {
      throw new TypeError('The `fb2` param cannot be a `string` in browser env.')
    }

    return {
      data: await file.text(),
      fileName: file.name,
    }
  }
  else {
    if (typeof file === 'string') {
      // Converting Buffer to Uint8 via `new UintArray` may
      //  result in garbled characters
      return {
        data: await readFile(file),
        fileName: path.basename(file),
      }
    }
    throw new Error('The `fb2` param cannot be a `File` in node env.')
  }
}

export function getFirstXmlNodeText(xmlNode: any): string {
  return xmlNode?.[0]._ ?? ''
}

export function extend<T extends object, U extends object>(
  target: T,
  source: U,
  ignoreKeys: (keyof (T & U))[] = [],
): T & U {
  for (const key in source) {
    if (
      Object.prototype.hasOwnProperty.call(source, key)
      && !(key in target)
    ) {
      if (!ignoreKeys.includes(key)) {
        // @ts-expect-error error
        target[key] = source[key]
      }
    }
  }
  return target as T & U
}

export const mimeTypeToResourceExtension: Record<string, string> = {
  // image
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/tiff': 'tif',
  'image/heic': 'heic',
  'image/avif': 'avif',

  // css, unused
  'text/css': 'css',
}

function base64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const binaryString = atob(base64String.trim())
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

export function saveResource(resource: Fb2Resource, resourceSaveDir: string): string {
  const { id, base64Data, contentType } = resource
  if (__BROWSER__) {
    // data
    const resourceUint8 = base64ToUint8Array(base64Data)
    const blob = new Blob([resourceUint8], { type: contentType })
    return URL.createObjectURL(blob)
  }
  else {
    // filePath
    let fileName = id
    const ext = mimeTypeToResourceExtension[contentType]
    if (!id.endsWith(ext)) {
      fileName = `${id}.${ext}`
    }
    const filePath = path.resolve(resourceSaveDir, fileName)
    // buffer
    const buffer = Buffer.from(base64Data, 'base64')
    writeFileSync(filePath, buffer)
    return filePath
  }
}

export function saveStylesheet(style: string, resourceSaveDir: string): string {
  if (__BROWSER__) {
    return URL.createObjectURL(new Blob([style], { type: 'text/css' }))
  }
  else {
    const filePath = path.resolve(resourceSaveDir, `${STYLESHEET_ID}.css`)
    writeFileSync(filePath, style)
    return filePath
  }
}

export function buildFb2Href(chapterId: string, fb2GlobalId?: string) {
  return HREF_PREFIX + chapterId + (fb2GlobalId ? (`#${fb2GlobalId}`) : '')
}

export function buildIdToSectionMap(
  sectionId: string,
  sectionNode: any,
  idToChapterMap: Map<string, string>,
): void {
  for (const node of sectionNode.children) {
    // ignore text node
    if (node['#name'] === '__text__') {
      continue
    }
    const $ = node.$
    // has attr
    if ($ && $.id) {
      idToChapterMap.set($.id, sectionId)
    }
    // has children
    if (node.children) {
      buildIdToSectionMap(sectionId, node, idToChapterMap)
    }
  }
}

const fb2TagToHtmlTagMap: Record<string, string> = {
  'section': 'div',
  'title': 'h2',
  'subtitle': 'h3',
  'poem': 'blockquote',
  'stanza': 'p',
  'v': 'p',
  'text-author': 'cite',
  'epigraph': 'blockquote',
  'empty-line': 'br',
  'image': 'img',
  'emphasis': 'em',
}

const selfClosingHtmlTag = new Set([
  'br',
  'img',
])

export function transformTagName(tag: string) {
  const transtormedTag = fb2TagToHtmlTagMap[tag] ?? tag
  return {
    tag: transtormedTag,
    isSelfClosing: selfClosingHtmlTag.has(transtormedTag),
  }
}
