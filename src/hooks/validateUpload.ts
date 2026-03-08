import type { CollectionBeforeChangeHook } from 'payload'

const MIN_RECOMMENDED_ARTWORK_DIMENSION = 1400
const MAX_RECOMMENDED_ARTWORK_DIMENSION = 3000
const TRANSCRIPT_EXTENSIONS = new Set(['.srt', '.vtt'])

const getFileExtension = (filename?: string | null): string | null => {
  if (!filename) {
    return null
  }

  const extensionIndex = filename.lastIndexOf('.')

  if (extensionIndex === -1) {
    return null
  }

  return filename.slice(extensionIndex).toLowerCase()
}

export const validateUploadDimensions: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if (operation !== 'create' || !data) {
    return data
  }

  if (typeof data.mimeType !== 'string') {
    return data
  }

  if (data.mimeType.startsWith('image/')) {
    const width = typeof data.width === 'number' ? data.width : null
    const height = typeof data.height === 'number' ? data.height : null

    if (width !== null && height !== null) {
      if (width !== height) {
        console.warn(
          `[media upload] ${data.filename ?? 'image upload'} is not square (${width}x${height}). Cover artwork should be square.`,
        )
      }

      const widthInRange = width >= MIN_RECOMMENDED_ARTWORK_DIMENSION && width <= MAX_RECOMMENDED_ARTWORK_DIMENSION
      const heightInRange = height >= MIN_RECOMMENDED_ARTWORK_DIMENSION && height <= MAX_RECOMMENDED_ARTWORK_DIMENSION

      if (!widthInRange || !heightInRange) {
        console.warn(
          `[media upload] ${data.filename ?? 'image upload'} is ${width}x${height}. Recommended artwork dimensions are between ${MIN_RECOMMENDED_ARTWORK_DIMENSION}x${MIN_RECOMMENDED_ARTWORK_DIMENSION} and ${MAX_RECOMMENDED_ARTWORK_DIMENSION}x${MAX_RECOMMENDED_ARTWORK_DIMENSION}.`,
        )
      }
    }

    return data
  }

  if (data.mimeType.includes('text/') || data.mimeType === 'application/x-subrip') {
    const extension = getFileExtension(data.filename)

    if (!extension || !TRANSCRIPT_EXTENSIONS.has(extension)) {
      console.warn(
        `[media upload] ${data.filename ?? 'text upload'} has mime type ${data.mimeType}. Transcript uploads should use .vtt or .srt extensions.`,
      )
    }
  }

  return data
}
