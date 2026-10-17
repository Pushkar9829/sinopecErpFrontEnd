import { resolveMediaUrl } from '../api/client';

export function imageSrc(image) {
  return resolveMediaUrl(image?.url || image?.dataUrl || '');
}
