import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Supabase 무료 플랜은 1주일 동안 활동이 없으면 프로젝트를 일시 정지한다.
// Vercel Cron이 하루 한 번 호출해 DB에 가벼운 조회를 남긴다. (vercel.json 참고)
export async function GET() {
  const shares = await prisma.share.count();
  return NextResponse.json({ ok: true, shares, at: new Date().toISOString() });
}
