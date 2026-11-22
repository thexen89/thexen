'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ShareItem, ShareRecord } from '@/lib/shareTypes';

type Status = 'live' | 'expired' | 'revoked';
const statusOf = (s: ShareRecord): Status =>
  s.revoked ? 'revoked' : s.expiresAt && new Date(s.expiresAt).getTime() < Date.now() ? 'expired' : 'live';
const STATUS_LABEL: Record<Status, string> = { live: '공유 중', expired: '기간 만료', revoked: '중지됨' };
const STATUS_CLASS: Record<Status, string> = {
  live: 'bg-emerald-500/15 text-emerald-300',
  expired: 'bg-amber-500/15 text-amber-300',
  revoked: 'bg-white/10 text-white/40',
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ko-KR') : '기한 없음');
const toDateInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const linkOf = (token: string) => (typeof window === 'undefined' ? '' : `${window.location.origin}/v/${token}`);
const rid = () => Math.random().toString(36).slice(2, 10);

/** 서버에서 1회용 업로드 URL을 받아 Supabase로 직접 올린다. */
async function uploadFile(shareId: string, file: File, onProgress?: (p: number) => void): Promise<string> {
  const res = await fetch('/api/shares/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareId, filename: file.name }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '업로드 URL 발급 실패');

  const fd = new FormData();
  fd.append('cacheControl', '3600');
  fd.append('', file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', json.signedUrl);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = e => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`업로드 실패 (${xhr.status}) ${xhr.responseText}`)));
    xhr.onerror = () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
    xhr.send(fd);
  });
  return json.path as string;
}

function imageSize(file: File): Promise<{ w: number; h: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, url });
    img.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    img.src = url;
  });
}

export default function SharesAdminPage() {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDays, setNewDays] = useState('14');
  const [toast, setToast] = useState('');

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const load = useCallback(async () => {
    const res = await fetch('/api/shares', { cache: 'no-store' });
    if (res.status === 401) {
      window.location.href = '/admin/login';
      return;
    }
    const json = await res.json();
    setShares(json.shares || []);
    setUrls(json.urls || {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch('/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, client: newClient, expiresInDays: Number(newDays) }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) return flash(json.error || '만들지 못했습니다.');
    setNewTitle('');
    setNewClient('');
    await load();
    setSelectedId(json.share.id);
  };

  const selected = shares.find(s => s.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-lg md:text-xl font-black tracking-tighter">THEXEN</a>
            <span className="text-white/20">|</span>
            <span className="text-white/60 text-sm">거래처 3D 공유</span>
          </div>
          <a href="/admin" className="px-3 py-2 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xs md:text-sm">
            ← 포트폴리오 관리
          </a>
        </div>
      </header>

      <div className="grid md:grid-cols-[340px_1fr] min-h-[calc(100vh-57px)]">
        {/* 목록 */}
        <aside className="border-r border-white/10 p-4 space-y-4">
          <div className="rounded-xl border border-white/10 p-3 space-y-2">
            <div className="text-sm font-semibold">새 공유 만들기</div>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="제목 (예: 보이스 키캡 · 콘셉트 01)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/40"
            />
            <input
              value={newClient}
              onChange={e => setNewClient(e.target.value)}
              placeholder="받는 곳 (내부 메모, 예: 매머드커피)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/40"
            />
            <div className="flex gap-2">
              <select
                value={newDays}
                onChange={e => setNewDays(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="7">7일</option>
                <option value="14">14일</option>
                <option value="30">30일</option>
                <option value="90">90일</option>
                <option value="0">기한 없음</option>
              </select>
              <button
                onClick={create}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 bg-white text-black font-medium rounded-lg text-sm disabled:opacity-40"
              >
                {creating ? '만드는 중…' : '만들기'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-white/40 text-sm">불러오는 중…</div>
          ) : shares.length === 0 ? (
            <div className="text-white/40 text-sm">아직 공유한 자료가 없습니다.</div>
          ) : (
            <ul className="space-y-2">
              {shares.map(s => {
                const st = statusOf(s);
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        s.id === selectedId ? 'border-white/60 bg-white/10' : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{s.title}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
                      </div>
                      <div className="mt-1 text-xs text-white/40 flex gap-2 flex-wrap">
                        {s.client && <span>{s.client}</span>}
                        <span>~{fmtDate(s.expiresAt)}</span>
                        <span>열람 {s.viewCount}회</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* 편집 */}
        <main className="p-4 md:p-6">
          {selected ? (
            <Editor
              key={selected.id + selected.updatedAt}
              share={selected}
              urls={urls}
              onChanged={load}
              onDeleted={() => { setSelectedId(null); load(); }}
              flash={flash}
            />
          ) : (
            <div className="h-full grid place-items-center text-white/40 text-sm text-center leading-relaxed">
              왼쪽에서 공유 건을 선택하거나 새로 만드세요.<br />
              대표 이미지와 GLB를 올리고, 이미지 위에 캐릭터 위치를 지정하면 링크가 완성됩니다.
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-sm px-4 py-2 rounded-full shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function Editor({
  share, urls, onChanged, onDeleted, flash,
}: {
  share: ShareRecord;
  urls: Record<string, string>;
  onChanged: () => Promise<void> | void;
  onDeleted: () => void;
  flash: (m: string) => void;
}) {
  const [title, setTitle] = useState(share.title);
  const [client, setClient] = useState(share.client || '');
  const [note, setNote] = useState(share.note || '');
  const [expires, setExpires] = useState(toDateInput(share.expiresAt));
  const [items, setItems] = useState<ShareItem[]>(share.items || []);
  const [cover, setCover] = useState({
    path: share.coverPath,
    w: share.coverWidth,
    h: share.coverHeight,
    url: share.coverPath ? urls[share.coverPath] || null : null,
  });
  const [localPosters, setLocalPosters] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, number | string>>({});
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const st = statusOf(share);
  const link = useMemo(() => linkOf(share.token), [share.token]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/shares/${share.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('저장 실패');
    return res.json();
  };

  const save = async (override?: { items?: ShareItem[]; cover?: typeof cover }) => {
    setSaving(true);
    try {
      const c = override?.cover || cover;
      await patch({
        title, client, note,
        expiresAt: expires ? new Date(`${expires}T23:59:59+09:00`).toISOString() : null,
        coverPath: c.path, coverWidth: c.w, coverHeight: c.h,
        items: override?.items || items,
      });
      setDirty(false);
      flash('저장했습니다.');
      await onChanged();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const touch = () => setDirty(true);

  const onCover = async (file?: File) => {
    if (!file) return;
    try {
      setBusy(b => ({ ...b, cover: 0 }));
      const size = await imageSize(file);
      const path = await uploadFile(share.id, file, p => setBusy(b => ({ ...b, cover: p })));
      const next = { path, w: size.w, h: size.h, url: size.url };
      setCover(next);
      await save({ cover: next });
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(b => { const n = { ...b }; delete n.cover; return n; });
    }
  };

  const addItemWithGlb = async (file?: File) => {
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) return flash('GLB 파일만 올릴 수 있습니다.');
    if (file.size > 50 * 1024 * 1024) return flash('50MB를 넘는 파일은 올릴 수 없습니다. 경량화한 GLB를 올려 주세요.');
    if (file.size > 25 * 1024 * 1024 && !window.confirm(`${(file.size / 1048576).toFixed(0)}MB 파일입니다. 거래처 화면에서 열리는 데 오래 걸릴 수 있습니다. 그래도 올릴까요?`)) return;
    const id = rid();
    const name = file.name.replace(/\.glb$/i, '').replace(/[_\s-]*(흉상|웹용|bust|web)/gi, '').trim() || file.name;
    try {
      setBusy(b => ({ ...b, [id]: 0 }));
      const glbPath = await uploadFile(share.id, file, p => setBusy(b => ({ ...b, [id]: p })));
      const next = [...items, { id, name, glbPath, posterPath: null, x: null, y: null, w: null, h: null }];
      setItems(next);
      await save({ items: next });
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(b => { const n = { ...b }; delete n[id]; return n; });
    }
  };

  const replaceGlb = async (itemId: string, file?: File) => {
    if (!file) return;
    try {
      setBusy(b => ({ ...b, [itemId]: 0 }));
      const glbPath = await uploadFile(share.id, file, p => setBusy(b => ({ ...b, [itemId]: p })));
      const next = items.map(i => (i.id === itemId ? { ...i, glbPath } : i));
      setItems(next);
      await save({ items: next });
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(b => { const n = { ...b }; delete n[itemId]; return n; });
    }
  };

  const setPoster = async (itemId: string, file?: File) => {
    if (!file) return;
    try {
      setBusy(b => ({ ...b, [`p-${itemId}`]: '이미지' }));
      const posterPath = await uploadFile(share.id, file);
      setLocalPosters(m => ({ ...m, [itemId]: URL.createObjectURL(file) }));
      const next = items.map(i => (i.id === itemId ? { ...i, posterPath } : i));
      setItems(next);
      await save({ items: next });
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(b => { const n = { ...b }; delete n[`p-${itemId}`]; return n; });
    }
  };

  const updateItem = (id: string, patchItem: Partial<ShareItem>) => {
    setItems(list => list.map(i => (i.id === id ? { ...i, ...patchItem } : i)));
    touch();
  };
  const move = (id: string, d: number) => {
    setItems(list => {
      const i = list.findIndex(x => x.id === id);
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const n = [...list];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    touch();
  };
  const removeItem = (id: string) => {
    if (!window.confirm('이 항목을 목록에서 뺄까요? (저장해야 반영됩니다)')) return;
    setItems(list => list.filter(i => i.id !== id));
    touch();
  };

  // 대표 이미지 위에 드래그로 클릭 영역 지정
  const pctAt = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  };
  const onDown = (e: React.PointerEvent) => {
    if (!drawingId) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    startRef.current = pctAt(e);
    setDraft({ ...startRef.current, w: 0, h: 0 });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawingId || !startRef.current) return;
    const p = pctAt(e), s0 = startRef.current;
    setDraft({ x: Math.min(s0.x, p.x), y: Math.min(s0.y, p.y), w: Math.abs(p.x - s0.x), h: Math.abs(p.y - s0.y) });
  };
  const onUp = () => {
    if (!drawingId || !startRef.current) return;
    startRef.current = null;
    if (draft && draft.w > 1 && draft.h > 1) {
      const r = (n: number) => Math.round(n * 10) / 10;
      updateItem(drawingId, { x: r(draft.x), y: r(draft.y), w: r(draft.w), h: r(draft.h) });
      setDrawingId(null);
    }
    setDraft(null);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      flash('링크를 복사했습니다.');
    } catch {
      window.prompt('링크를 복사하세요', link);
    }
  };

  const toggleRevoke = async () => {
    await patch({ revoked: !share.revoked });
    flash(share.revoked ? '공유를 다시 열었습니다.' : '공유를 중지했습니다. 링크가 더 이상 열리지 않습니다.');
    await onChanged();
  };
  const regenerate = async () => {
    if (!window.confirm('새 링크로 바꾸면 이전에 보낸 링크는 열리지 않습니다. 바꿀까요?')) return;
    await patch({ regenerateToken: true });
    flash('새 링크를 만들었습니다.');
    await onChanged();
  };
  const remove = async () => {
    if (!window.confirm(`'${share.title}' 공유와 올린 파일을 모두 삭제합니다. 되돌릴 수 없습니다. 삭제할까요?`)) return;
    await fetch(`/api/shares/${share.id}`, { method: 'DELETE' });
    flash('삭제했습니다.');
    onDeleted();
  };

  const posterUrl = (i: ShareItem) => localPosters[i.id] || (i.posterPath ? urls[i.posterPath] : undefined);
  const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/40';

  return (
    <div className="max-w-5xl space-y-6">
      {/* 링크 */}
      <section className="rounded-xl border border-white/10 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
            <span className="text-xs text-white/40">
              열람 {share.viewCount}회{share.lastViewedAt && ` · 마지막 ${new Date(share.lastViewedAt).toLocaleString('ko-KR')}`}
            </span>
          </div>
          <div className="mt-2 text-sm font-mono text-white/80 truncate">{link}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copy} className="px-3 py-2 bg-white text-black rounded-lg text-sm font-medium">링크 복사</button>
          <a href={link} target="_blank" rel="noreferrer" className="px-3 py-2 bg-white/10 rounded-lg text-sm">열어보기</a>
          <button onClick={toggleRevoke} className="px-3 py-2 bg-white/10 rounded-lg text-sm">{share.revoked ? '공유 재개' : '공유 중지'}</button>
          <button onClick={regenerate} className="px-3 py-2 bg-white/10 rounded-lg text-sm">새 링크</button>
          <button onClick={remove} className="px-3 py-2 bg-red-500/15 text-red-300 rounded-lg text-sm">삭제</button>
        </div>
      </section>

      {/* 기본 정보 */}
      <section className="grid md:grid-cols-3 gap-3">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs text-white/50">제목 (거래처 화면에 표시)</span>
          <input className={input} value={title} onChange={e => { setTitle(e.target.value); touch(); }} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/50">공유 마감일 (비우면 기한 없음)</span>
          <input type="date" className={input} value={expires} onChange={e => { setExpires(e.target.value); touch(); }} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/50">받는 곳 (내부 메모)</span>
          <input className={input} value={client} onChange={e => { setClient(e.target.value); touch(); }} />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs text-white/50">안내 문구 (선택, 제목 아래 표시)</span>
          <input className={input} value={note} onChange={e => { setNote(e.target.value); touch(); }} placeholder="예: 1차 샘플 전 형태 확인용입니다." />
        </label>
      </section>

      {/* 대표 이미지 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">대표 이미지</div>
          <label className="px-3 py-1.5 bg-white/10 rounded-lg text-xs cursor-pointer">
            {'cover' in busy ? `올리는 중 ${busy.cover}%` : cover.path ? '이미지 바꾸기' : '이미지 올리기'}
            <input type="file" accept="image/*" hidden onChange={e => onCover(e.target.files?.[0])} />
          </label>
        </div>
        {cover.url ? (
          <div
            ref={stageRef}
            className={`relative rounded-xl overflow-hidden select-none ${drawingId ? 'cursor-crosshair ring-2 ring-emerald-400' : ''}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{ touchAction: drawingId ? 'none' : 'auto' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.url} alt="" className="w-full h-auto block pointer-events-none" draggable={false} />
            {items.filter(i => i.w && i.h && i.id !== drawingId).map(i => (
              <div
                key={i.id}
                className="absolute border-2 border-white/90 rounded-xl bg-white/10 pointer-events-none"
                style={{ left: `${i.x}%`, top: `${i.y}%`, width: `${i.w}%`, height: `${i.h}%` }}
              >
                <span className="absolute -top-6 left-0 text-[11px] bg-black/80 px-2 py-0.5 rounded">{i.name}</span>
              </div>
            ))}
            {draft && (
              <div className="absolute border-2 border-emerald-400 rounded-xl bg-emerald-400/15 pointer-events-none"
                style={{ left: `${draft.x}%`, top: `${draft.y}%`, width: `${draft.w}%`, height: `${draft.h}%` }} />
            )}
            {drawingId && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 text-xs px-3 py-1.5 rounded-full pointer-events-none">
                {items.find(i => i.id === drawingId)?.name} 위치를 드래그로 지정하세요
              </div>
            )}
          </div>
        ) : cover.path ? (
          <div className="rounded-xl border border-white/10 p-6 text-sm text-white/40">이미지를 불러오는 중이거나 미리보기 링크가 만료되었습니다. 새로고침해 주세요.</div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-sm text-white/40 text-center">
            대표 이미지를 올리면 그 위에 클릭 위치를 지정할 수 있습니다. (없어도 버튼으로 3D를 볼 수 있습니다)
          </div>
        )}
      </section>

      {/* 3D 항목 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">3D 항목 ({items.length})</div>
          <label className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-medium cursor-pointer">
            + GLB 추가
            <input type="file" accept=".glb,model/gltf-binary" hidden onChange={e => { addItemWithGlb(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>

        <ul className="space-y-2">
          {items.map((i, idx) => (
            <li key={i.id} className="rounded-xl border border-white/10 p-3 flex flex-col md:flex-row md:items-center gap-3">
              <label className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden shrink-0 cursor-pointer grid place-items-center text-[10px] text-white/40" title="썸네일 이미지 (선택)">
                {posterUrl(i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={posterUrl(i)} alt="" className="w-full h-full object-cover" />
                ) : busy[`p-${i.id}`] ? '…' : '썸네일'}
                <input type="file" accept="image/*" hidden onChange={e => setPoster(i.id, e.target.files?.[0])} />
              </label>
              <input className={`${input} md:max-w-[200px]`} value={i.name} onChange={e => updateItem(i.id, { name: e.target.value })} />
              <div className="flex-1 text-xs text-white/40">
                {i.id in busy ? `GLB 올리는 중 ${busy[i.id]}%` : i.w ? '위치 지정됨' : cover.url ? '위치 미지정 (버튼으로만 표시)' : ''}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {cover.url && (
                  <>
                    <button
                      onClick={() => setDrawingId(drawingId === i.id ? null : i.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs ${drawingId === i.id ? 'bg-emerald-500 text-black' : 'bg-white/10'}`}
                    >
                      {drawingId === i.id ? '지정 취소' : '위치 지정'}
                    </button>
                    {i.w ? <button onClick={() => updateItem(i.id, { x: null, y: null, w: null, h: null })} className="px-2.5 py-1.5 bg-white/10 rounded-lg text-xs">위치 지우기</button> : null}
                  </>
                )}
                <label className="px-2.5 py-1.5 bg-white/10 rounded-lg text-xs cursor-pointer">
                  GLB 교체
                  <input type="file" accept=".glb,model/gltf-binary" hidden onChange={e => replaceGlb(i.id, e.target.files?.[0])} />
                </label>
                <button onClick={() => move(i.id, -1)} disabled={idx === 0} className="px-2 py-1.5 bg-white/10 rounded-lg text-xs disabled:opacity-30">↑</button>
                <button onClick={() => move(i.id, 1)} disabled={idx === items.length - 1} className="px-2 py-1.5 bg-white/10 rounded-lg text-xs disabled:opacity-30">↓</button>
                <button onClick={() => removeItem(i.id)} className="px-2.5 py-1.5 bg-red-500/15 text-red-300 rounded-lg text-xs">빼기</button>
              </div>
            </li>
          ))}
          {Object.keys(busy).filter(k => !items.some(i => i.id === k) && k !== 'cover' && !k.startsWith('p-')).map(k => (
            <li key={k} className="rounded-xl border border-white/10 p-3 text-xs text-white/50">새 GLB 올리는 중 {busy[k]}%</li>
          ))}
        </ul>
        <p className="text-xs text-white/35">GLB는 웹용으로 경량화한 파일(권장 15MB 이하)을 올려 주세요. 원본(40MB 이상)은 거래처 화면에서 오래 걸립니다.</p>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={() => save()}
          disabled={saving || !dirty}
          className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg text-sm shadow-lg disabled:opacity-40"
        >
          {saving ? '저장 중…' : dirty ? '변경 내용 저장' : '저장됨'}
        </button>
      </div>
    </div>
  );
}
