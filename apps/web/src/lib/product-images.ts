export type ImageKind = 'design' | 'model' | 'garment';
export type ProductImage = {id:string;product_id:string;kind:ImageKind;name:string;alt:string;data_url:string};
export const productImageKinds: ImageKind[] = ['design','model','garment'];
export function parseProductImage(value:unknown):ProductImage {
  if(!value || typeof value!=='object') throw Error('Invalid product image');
  const p=value as Record<string,unknown>;
  for(const key of ['id','product_id','name','data_url']) if(typeof p[key]!=='string'||!p[key].trim()) throw Error('Invalid image field');
  if(typeof p.alt!=='string') throw Error('Invalid image description');
  if(!productImageKinds.includes(p.kind as ImageKind) || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data_url as string) || (p.data_url as string).length>3*1024*1024 || (p.alt as string).length>240 || (p.name as string).length>120) throw Error('Invalid image content');
  return {id:p.id as string,product_id:p.product_id as string,kind:p.kind as ImageKind,name:p.name as string,alt:p.alt as string,data_url:p.data_url as string};
}
export function parseProductImages(value:unknown):{images:ProductImage[]} {
  if(!value || typeof value!=='object' || !('images' in value) || !Array.isArray(value.images) || value.images.length>30) throw Error('Invalid image list');
  const images=value.images.map(parseProductImage);
  if(new Set(images.map(image=>image.id)).size!==images.length) throw Error('Duplicate image');
  return {images};
}
