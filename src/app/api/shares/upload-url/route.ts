import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storageAdmin, SHARE_BUCKET, newObjectName } from '@/lib/shareStorage';

// 관리자 전용(POST → 미들웨어 확인). 브라우저가 Supabase로 직접 올릴 수 있는 1회용 업로드 URL을 발급한다.
// Vercel 함수의 요청 크기 제한(약 4.5MB)을 피하기 위해 파일은 이 서버를 거치지 않는다.
export async function POST(request: NextRequest) {
  const { shareId, filename } = await request.json().catch(() => ({}));
  if (!shareId || !filename) return NextResponse.json({ error: 'shareId, filename 필요' }, { status: 400 });

  const share = await prisma.share.findUnique({ where: { id: String(shareId) }, select: { id: true } });
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const path = `${share.id}/${newObjectName(String(filename))}`;
  const { data, error } = await storageAdmin().storage.from(SHARE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('createSignedUploadUrl failed', error);
    return NextResponse.json({ error: '업로드 URL 발급 실패' }, { status: 500 });
  }
  return NextResponse.json({ path, signedUrl: data.signedUrl });
}
