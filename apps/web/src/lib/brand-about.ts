export type BrandTopic = { id: string; title: string; description: string; image: string; alt: string };
export type BrandContent = { eyebrow: string; title: string; intro: string; philosophy_title: string; philosophy_body: string; hero_image: string; hero_alt: string; topics: BrandTopic[] };
export type BrandState = { revision: number; draft: BrandContent; published: BrandContent; published_revision: number };
export const BRAND_PRESETS = ['/images/brand/individuality-hero.png', '/images/brand/ai-language.png', '/images/brand/hidden-patterns.png', '/images/brand/human-ai.png'];
export const CONCEPT_CAPTION = '디자인 콘셉트 예시 · 실제 판매 상품이 아닙니다';
export const ASSET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid object'); return value as Record<string, unknown>; };
const string = (value: unknown, max: number) => { if (typeof value !== 'string' || !value.trim() || [...value].length > max) throw Error('Invalid text'); return value; };
const revision = (value: unknown) => { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error('Invalid revision'); return value; };
export function parseBrandImage(value: unknown): string { const s = string(value, 200); if (!BRAND_PRESETS.includes(s) && !(s.startsWith('/api/v1/brand-about/assets/') && ASSET_ID.test(s.slice('/api/v1/brand-about/assets/'.length)))) throw Error('Invalid image'); return s; }
export function brandImageUrl(value: string, preview = false) { const safe = parseBrandImage(value); return safe.replace('/api/v1/brand-about/assets/', preview ? '/api/admin/brand-about/assets/' : '/api/brand-about/assets/'); }
export function parseBrandContent(value: unknown): BrandContent {
  const v = object(value); if (!Array.isArray(v.topics) || v.topics.length > 6) throw Error('Invalid topics');
  const topics = v.topics.map(value => { const t = object(value); const id = string(t.id, 64); if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw Error('Invalid id'); return { id, title: string(t.title, 80), description: string(t.description, 800), image: parseBrandImage(t.image), alt: string(t.alt, 200) }; });
  if (new Set(topics.map(t => t.id)).size !== topics.length) throw Error('Duplicate topic');
  const philosophy_title = v.philosophy_title === undefined || v.philosophy_title === '' ? '' : string(v.philosophy_title, 100);
  const philosophy_body = v.philosophy_body === undefined || v.philosophy_body === '' ? '' : string(v.philosophy_body, 2000);
  if (Boolean(philosophy_title) !== Boolean(philosophy_body)) throw Error('Incomplete philosophy');
  return { philosophy_title, philosophy_body, eyebrow: string(v.eyebrow, 60), title: string(v.title, 100), intro: string(v.intro, 1500), hero_image: parseBrandImage(v.hero_image), hero_alt: string(v.hero_alt, 200), topics };
}
export function parseBrandState(value: unknown): BrandState { const v = object(value); const result = { revision: revision(v.revision), published_revision: revision(v.published_revision), draft: parseBrandContent(v.draft), published: parseBrandContent(v.published) }; if (result.published_revision > result.revision) throw Error('Invalid version order'); return result; }
export function parsePublicBrand(value: unknown) { const v = object(value); return { revision: revision(v.revision), content: parseBrandContent(v.content) }; }
export function parseBrandUpload(value: unknown) { const image = parseBrandImage(object(value).image); if (BRAND_PRESETS.includes(image)) throw Error('Invalid upload'); return { image }; }
export async function readBrandBody(source: Request | Response, limit: number): Promise<Uint8Array> {
  if (Number(source.headers.get('content-length')) > limit) throw Error('Too large');
  const reader = source.body?.getReader(); if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw Error('Too large'); } parts.push(value); } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; } return bytes;
}
