import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {FACTORY_SESSION_COOKIE,lookupFactorySession} from './factory-session-core';
export function factoryApiBase(){return (process.env.FACTORY_API_BASE_URL||process.env.ADMIN_API_BASE_URL||'http://127.0.0.1:8100').replace(/\/$/,'');}
export async function getFactorySession(){return lookupFactorySession((await cookies()).get(FACTORY_SESSION_COOKIE)?.value);}
export async function requireFactorySession(){const session=await getFactorySession();if(!session)redirect('/factory/login');return session;}
