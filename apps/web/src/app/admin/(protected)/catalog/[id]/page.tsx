import {requireAdminSession} from '@/lib/admin-session';
import {CatalogManager} from '../catalog-manager';

export default async function ProductDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved_image?:string|string[]}>}) {
  await requireAdminSession();
  const {id}=await params;
  const query=await searchParams;
  return <CatalogManager mode="detail" productId={id} savedImageId={typeof query.saved_image==='string'?query.saved_image:''}/>;
}
