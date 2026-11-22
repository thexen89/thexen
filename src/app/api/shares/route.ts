import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminGuard';
import { newShareToken, signPaths } from '@/lib/shareStorage';
import { imagesOf, type ShareItem } from '@/lib/shareTypes';

export const dynamic = 'force-dynamic';

// 관리자: 공유 목록 (대표 이미지·포스터는 1시간 서명 URL 포함)
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const shares = await prisma.share.findMany({ orderBy: { createdAt: 'desc' } });
  const paths: string[] = [];
  for (const s of shares) {
    if (s.coverPath) paths.push(s.coverPath);
    for (const im of imagesOf(s)) paths.push(im.path);
    for (const it of (s.items as unknown as ShareItem[]) || []) if (it.posterPath) paths.push(it.posterPath);
  }
  let urls: Record<string, string> = {};
  try {
    urls = await signPaths(paths, 3600);
  } catch (e) {
    console.error('signPaths failed', e);
  }
  return NextResponse.json({ shares, urls });
}

// 관리자: 새 공유 만들기
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 });

  const days = Number(body.expiresInDays);
  const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000) : null;

  const share = await prisma.share.create({
    data: {
      token: newShareToken(),
      title,
      client: body.client ? String(body.client).trim() : null,
      expiresAt,
      items: [],
    },
  });
  return NextResponse.json({ share });
}
