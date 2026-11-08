import {FaqEditor} from '@/components/faq';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <main id="main" className="admin-page"><FaqEditor id={id}/></main>;}
