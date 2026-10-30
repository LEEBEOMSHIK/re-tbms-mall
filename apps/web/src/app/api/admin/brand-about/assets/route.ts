import { brandProxy } from '@/app/api/brand-about/proxy';
export const runtime = 'nodejs';
export async function POST(request: Request) { return brandProxy(request, true, '/assets'); }
