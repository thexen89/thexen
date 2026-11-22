import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { signPaths } from '@/lib/shareStorage';
import { imagesOf, type ShareItem, type ViewerData } from '@/lib/shareTypes';
import ShareViewer from '@/components/share/ShareViewer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'THEXEN · 컨펌 자료',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

// 서명 URL 유효시간. 페이지를 오래 열어 둔 채 클릭해도 열리도록 넉넉히 둔다.
const URL_TTL = 60 * 60 * 6;

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f3efe9] text-[#2a2723] px-6">
      <div className="text-center max-w-sm">
        <div className="text-xs tracking-[.2em] text-[#7a736a] font-semibold">THEXEN</div>
        <h1 className="mt-3 text-xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-[#7a736a] leading-relaxed whitespace-pre-line">{body}</p>
      </div>
    </main>
  );
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { token } });

  if (!share || share.revoked) {
    return <Notice title="열 수 없는 링크입니다" body={'링크가 올바르지 않거나 공유가 종료되었습니다.\n더젠 담당자에게 문의해 주세요.'} />;
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return <Notice title="공유 기간이 끝났습니다" body={'확인이 더 필요하시면 더젠 담당자에게\n새 링크를 요청해 주세요.'} />;
  }

  const items = (share.items as unknown as ShareItem[]) || [];
  const images = imagesOf(share);
  const urls = await signPaths(
    [...images.map(im => im.path), ...items.flatMap(i => [i.glbPath, i.posterPath || ''])],
    URL_TTL,
  );

  // 열람 기록 (실패해도 페이지는 연다)
  prisma.share
    .update({ where: { id: share.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } })
    .catch(() => null);

  const data: ViewerData = {
    title: share.title,
    note: share.note,
    images: images
      .filter(im => urls[im.path])
      .map(im => ({
        id: im.id,
        url: urls[im.path],
        width: im.width,
        height: im.height,
        caption: im.caption || null,
        hotspots: (im.hotspots || []).filter(h => items.some(i => i.id === h.itemId && urls[i.glbPath])),
      })),
    expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
    items: items
      .filter(i => urls[i.glbPath])
      .map(i => ({
        id: i.id,
        name: i.name,
        glbUrl: urls[i.glbPath],
        posterUrl: i.posterPath ? urls[i.posterPath] || null : null,
        x: i.x, y: i.y, w: i.w, h: i.h,
      })),
  };

  return <ShareViewer data={data} />;
}
