import { brandProxy } from '@/app/api/brand-about/proxy';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{id:string}> }) { return brandProxy(request, false, `/assets/${(await params).id}`); }
