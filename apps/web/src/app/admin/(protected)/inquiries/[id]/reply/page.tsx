import {Inquiries} from '@/components/inquiries';
export default async function Page({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <main id="main" className="admin-page"><Inquiries admin mode="reply" id={id}/></main>;}
