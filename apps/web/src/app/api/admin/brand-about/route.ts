import { brandProxy } from '@/app/api/brand-about/proxy';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request) { return brandProxy(request, true); }
export async function PUT(request: Request) { return brandProxy(request, true); }
