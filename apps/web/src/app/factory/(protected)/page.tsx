import {requireFactorySession} from '@/lib/factory-session';
import {FactoryWorkspace} from '../factory-workspace';
export default async function Page(){await requireFactorySession();return <FactoryWorkspace/>;}
