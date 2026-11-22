import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { newShareToken, removeShareFolder } from '@/lib/shareStorage';
import type { Hotspot, ShareImage, ShareItem } from '@/lib/shareTypes';

// PATCH/DELETE는 미들웨어에서 관리자 세션을 확인한다.

const pct = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
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

  if ('title' in body) data.title = String(body.title || '').normalize('NFC').trim() || share.title;
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
        name: String(raw.name || '').normalize('NFC').trim() || '이름 없음',
        glbPath,
        posterPath: ownPath(raw.posterPath),
        x: pct(raw.x), y: pct(raw.y), w: pct(raw.w), h: pct(raw.h),
      });
    }
    data.items = items;
  }

  if (Array.isArray(body.images)) {
    const images: ShareImage[] = [];
    for (const raw of body.images) {
      const path = ownPath(raw?.path);
      if (!path) continue;
      const hotspots: Hotspot[] = [];
      for (const h of Array.isArray(raw.hotspots) ? raw.hotspots : []) {
        const x = pct(h?.x), y = pct(h?.y), w = pct(h?.w), hh = pct(h?.h);
        if (!h?.itemId || x === null || y === null || !w || !hh) continue;
        hotspots.push({ itemId: String(h.itemId), x, y, w, h: hh });
      }
      images.push({
        id: String(raw.id || Math.random().toString(36).slice(2, 10)),
        path,
        width: Number(raw.width) || null,
        height: Number(raw.height) || null,
        caption: raw.caption ? String(raw.caption).normalize('NFC').trim() || null : null,
        hotspots,
      });
    }
    data.images = images;
    // 예전 방식 필드는 첫 장과 맞춰 둔다
    data.coverPath = images[0]?.path || null;
    data.coverWidth = images[0]?.width || null;
    data.coverHeight = images[0]?.height || null;
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
