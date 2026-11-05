import type { Metadata } from 'next';
import { Gallery } from './gallery';

export const metadata: Metadata = { title: '디자인 시스템 | RE:TAG 관리자' };

export default function DesignSystemPage() {
  return <Gallery/>;
}
