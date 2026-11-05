import {requireAdminSession} from '@/lib/admin-session';
import HeroEditor from './hero-editor';

export default async function HeroSettingsPage(){
  await requireAdminSession();
  return <HeroEditor/>;
}
