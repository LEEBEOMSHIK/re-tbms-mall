import {requireAdminSession} from '@/lib/admin-session';
import {ProductImageUploader} from '../../../product-images';
import type {ImageKind} from '@/lib/product-images';
export default async function NewProductImagePage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{kind?:string}>}){
 await requireAdminSession();const {id}=await params;const {kind}=await searchParams;
 return <ProductImageUploader key={`${id}-${kind}`} productId={id} initialKind={kind&&['design','model','garment'].includes(kind)?kind as ImageKind:'model'}/>;
}
