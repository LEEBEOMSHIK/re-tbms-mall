import { brandProxy } from './proxy';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request) { return brandProxy(request, false); }
