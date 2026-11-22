import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { newShareToken, removeShareFolder } from '@/lib/shareStorage';
import type { ShareItem } from '@/lib/shareTypes';

// PATCH/DELETE는 미들웨어에서 관리자 세션을 확인한다.

const pct = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const share = await prisma.share.findUnique({ where: { id } });
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  const ownPath = (p: unknown) => typeof p === 'string' && p.startsWith(`${id}/`) ? p : null;

  if ('title' in body) data.title = String(body.title || '').trim() || share.title;
  if ('client' in body) data.client = body.client ? String(body.client).trim() : null;
  if ('note' in body) data.note = body.note ? String(body.note) : null;
  if ('coverPath' in body) data.coverPath = ownPath(body.coverPath);
  if ('coverWidth' in body) data.coverWidth = Number(body.coverWidth) || null;
  if ('coverHeight' in body) data.coverHeight = Number(body.coverHeight) || null;
  if ('revoked' in body) data.revoked = Boolean(body.revoked);
  if ('expiresAt' in body) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.regenerateToken) data.token = newShareToken();

  if (Array.isArray(body.items)) {
    const items: ShareItem[] = [];
    for (const raw of body.items) {
      const glbPath = ownPath(raw?.glbPath);
      if (!glbPath) continue;
      items.push({
        id: String(raw.id || Math.random().toString(36).slice(2, 10)),
        name: String(raw.name || '').trim() || '이름 없음',
        glbPath,
        posterPath: ownPath(raw.posterPath),
        x: pct(raw.x), y: pct(raw.y), w: pct(raw.w), h: pct(raw.h),
      });
    }
    data.items = items;
  }

  const updated = await prisma.share.update({ where: { id }, data });
  return NextResponse.json({ share: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await removeShareFolder(id);
  } catch (e) {
    console.error('removeShareFolder failed', e);
  }
  await prisma.share.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
