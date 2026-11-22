import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

export const SHARE_BUCKET = 'shares';

let client: SupabaseClient | null = null;

/** 서버 전용 Supabase 클라이언트 (service role). 브라우저로 절대 내보내지 않는다. */
export function storageAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function newShareToken(): string {
  // 24자, URL 안전, 추측 불가
  return randomBytes(18).toString('base64url');
}

export function newObjectName(original: string): string {
  const ext = (original.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  return `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`;
}

/** 여러 경로를 한 번에 서명. 경로 → URL 맵 반환 */
export async function signPaths(paths: string[], expiresIn: number): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await storageAdmin().storage.from(SHARE_BUCKET).createSignedUrls(unique, expiresIn);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data || []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

/** 공유 건 폴더(shareId/) 아래 파일 전체 삭제 */
export async function removeShareFolder(shareId: string) {
  const bucket = storageAdmin().storage.from(SHARE_BUCKET);
  const { data } = await bucket.list(shareId, { limit: 1000 });
  const paths = (data || []).map(f => `${shareId}/${f.name}`);
  if (paths.length) await bucket.remove(paths);
}
