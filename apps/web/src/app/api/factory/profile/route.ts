import {factoryProxy} from '@/lib/factory-proxy';
import {parseFactoryProfile} from '@/lib/factory';
export const dynamic='force-dynamic';
export async function GET(request:Request){return factoryProxy(request,'profile','GET',parseFactoryProfile);}
export async function PUT(request:Request){return factoryProxy(request,'profile','PUT',parseFactoryProfile,{preserveRateLimit:true});}
