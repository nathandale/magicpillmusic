const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && value.constructor === Object

/**
 * Recursive merge of `patch` onto `base`, for reconstructing "what the document
 * will look like after this change" from a `beforeChange` hook's `data` (which may
 * be a sparse/partial payload) and `originalDoc` (the prior full document).
 *
 * A naive shallow `{ ...originalDoc, ...data }` is wrong for nested group fields:
 * if a caller sends `{ myradio: { theme: 'x' } }` without the rest of the
 * `myradio` group, a shallow merge would replace the *entire* `myradio` object
 * with just `{ theme: 'x' }`, silently discarding `themeTokens`, `themeAssets`,
 * etc. that weren't part of this particular request. This merges plain objects
 * recursively instead; arrays and primitives are replaced wholesale, which is
 * correct for this project's field shapes (no nested arrays need element-wise
 * merging).
 */
export const deepMerge = <T extends Record<string, unknown>>(base: T, patch: Partial<T> | undefined | null): T => {
  if (!patch) return base

  const result: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    const baseValue = result[key]
    if (isPlainObject(value) && isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, value)
    } else {
      result[key] = value
    }
  }

  return result as T
}
