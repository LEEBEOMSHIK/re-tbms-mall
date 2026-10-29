import {requireAdminSession} from '@/lib/admin-session';
import {PublicationEditor} from '../../../publication-editor';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <PublicationEditor id={id}/>}
