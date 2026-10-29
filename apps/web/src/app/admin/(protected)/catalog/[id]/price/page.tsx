import {requireAdminSession} from '@/lib/admin-session';
import {ProductPrice} from '../../product-price';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <ProductPrice key={id} id={id} history/>;}
