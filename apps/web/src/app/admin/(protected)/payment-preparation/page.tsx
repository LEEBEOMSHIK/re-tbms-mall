import type {Metadata} from 'next';
import {requireAdminSession} from '@/lib/admin-session';
import {PaymentPreparationView} from './preparation-view';
export const metadata:Metadata={title:'PG 도입 준비 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page(){await requireAdminSession();return <PaymentPreparationView/>;}
