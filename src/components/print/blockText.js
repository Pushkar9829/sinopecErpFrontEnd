// What a page prints for a block's heading: the owner's name when they renamed
// it in Settings → Documents, otherwise the page's own wording.
export function blockText(doc, key, fallback) {
  const part = doc?.layout?.blocks?.find((b) => b.key === key);
  return part?.label && part.label !== part.defaultLabel ? part.label : fallback;
}
