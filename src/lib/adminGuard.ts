import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

/** 관리자 세션이 없으면 401 응답을, 있으면 null을 돌려준다. (미들웨어는 GET을 막지 않으므로 GET 라우트에서 직접 호출) */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
