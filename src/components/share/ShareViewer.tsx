'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerData } from '@/lib/shareTypes';
import s from './ShareViewer.module.css';

type MV = HTMLElement & {
  src: string;
  cameraOrbit: string;
  jumpCameraToGoal: () => void;
  availableAnimations?: string[];
  animationName?: string;
  currentTime?: number;
  play?: (opts?: { repetitions?: number }) => void;
};

// GLB 안에 'open'과 'close' 애니메이션이 있으면 열기/닫기 버튼을 보여 준다. 기본 상태는 닫힘.
type AnimState = 'none' | 'closed' | 'open' | 'opening' | 'closing';

export default function ShareViewer({ data }: { data: ViewerData }) {
  const { items } = data;
  const [current, setCurrent] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [anim, setAnim] = useState<AnimState>('none');
  const [slide, setSlide] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const swipeX = useRef<number | null>(null);
  // 사진 영역 비율: 가장 세로로 긴 사진에 맞춘다 (넘길 때 화면 높이가 흔들리지 않게)
  const stageRatio = data.images.reduce((r, im) => (im.width && im.height ? Math.min(r, im.width / im.height) : r), 16 / 9);
  const mvRef = useRef<MV | null>(null);
  // 마지막으로 다 불러온 GLB 주소. 같은 제품을 다시 열면 다시 불러오지 않고 그대로 보여 준다.
  const loadedUrl = useRef<string | null>(null);
  const item = items.find(i => i.id === current) || null;

  // model-viewer는 브라우저 전용 웹 컴포넌트라 클라이언트에서만 불러온다.
  useEffect(() => {
    import('@google/model-viewer').catch(() => setFailed(true));
  }, []);

  // 처음 화면이 뜬 뒤 첫 번째 모델을 미리 받아 두어 첫 클릭 대기를 줄인다.
  useEffect(() => {
    if (!items[0]) return;
    const t = setTimeout(() => {
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = items[0].glbUrl;
      l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    }, 1500);
    return () => clearTimeout(t);
  }, [items]);

  const bindMv = useCallback((el: MV | null) => {
    mvRef.current = el;
    if (!el || (el as unknown as { _bound?: boolean })._bound) return;
    (el as unknown as { _bound?: boolean })._bound = true;
    el.addEventListener('progress', (e: Event) => {
      const p = (e as CustomEvent<{ totalProgress: number }>).detail?.totalProgress ?? 0;
      setProgress(Math.round(p * 100));
    });
    el.addEventListener('load', () => {
      loadedUrl.current = el.src;
      setLoaded(true);
      el.jumpCameraToGoal?.();
      const list = el.availableAnimations || [];
      setAnim(list.includes('open') && list.includes('close') ? 'closed' : 'none');
    });
    el.addEventListener('finished', () => {
      setAnim(prev => (prev === 'opening' ? 'open' : prev === 'closing' ? 'closed' : prev));
    });
    el.addEventListener('error', () => setFailed(true));
  }, []);

  const show = useCallback((id: string) => {
    const it = items.find(i => i.id === id);
    if (!it || id === current) return;
    // 이미 불러온 모델을 다시 여는 경우: 로딩 상태와 열기/닫기 상태를 그대로 유지
    if (loadedUrl.current !== it.glbUrl) {
      setLoaded(false);
      setFailed(false);
      setProgress(0);
      setAnim('none');
    }
    setCurrent(id);
  }, [items, current]);

  const close = useCallback(() => setCurrent(null), []);

  const go = useCallback((d: number) => {
    const n = data.images.length;
    if (n > 1) setSlide(k => (k + d + n) % n);
  }, [data.images.length]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.images.length]);

  // 3D 창이 닫혀 있을 때 좌우 화살표 키로 사진 넘기기
  useEffect(() => {
    if (current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go]);

  const toggleAnim = useCallback(() => {
    const el = mvRef.current;
    if (!el?.play || (anim !== 'closed' && anim !== 'open')) return;
    const name = anim === 'closed' ? 'open' : 'close';
    el.animationName = name;
    el.currentTime = 0;
    el.play({ repetitions: 1 });
    setAnim(anim === 'closed' ? 'opening' : 'closing');
  }, [anim]);

  useEffect(() => {
    if (!current) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = items.findIndex(x => x.id === current);
        const d = e.key === 'ArrowRight' ? 1 : -1;
        show(items[(i + d + items.length) % items.length].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [current, items, close, show]);

  useEffect(() => {
    const el = mvRef.current;
    if (!el || !item) return;
    el.cameraOrbit = '0deg 80deg auto';
    if (el.src !== item.glbUrl) {
      el.src = item.glbUrl;
    } else {
      // 같은 모델: 다시 불러오지 않고 시점만 정면으로
      el.jumpCameraToGoal?.();
    }
  }, [item]);

  const expires = data.expiresAt ? new Date(data.expiresAt) : null;
  const images = data.images;
  const img = images[slide] || null;
  const many = images.length > 1;
  const hasHotspots = images.some(im => im.hotspots.length > 0);
  const nameOf = (id: string) => items.find(i => i.id === id)?.name || '';

  // 사진 영역 안에서 사진이 차지하는 실제 크기 (사진마다 비율이 달라도 클릭 위치가 정확히 맞도록)
  const ratio = img && img.width && img.height ? img.width / img.height : 16 / 10;
  const fw = box.w && box.h ? Math.min(box.w, box.h * ratio) : 0;
  const fh = fw ? fw / ratio : 0;

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <header className={s.header}>
          <div>
            <div className={s.brand}>THEXEN</div>
            <h1 className={s.title}>{data.title}</h1>
          </div>
          <span className={s.tag}>
            컨펌용 · 외부 배포 금지
            {expires && ` · ${expires.getMonth() + 1}/${expires.getDate()}까지`}
          </span>
        </header>

        {data.note && <p className={s.note}>{data.note}</p>}

        {img && (
          <>
            <div
              ref={stageRef}
              className={s.stage}
              style={{ aspectRatio: String(stageRatio) }}
              onPointerDown={e => { swipeX.current = e.clientX; }}
              onPointerUp={e => {
                if (swipeX.current === null || !many) return;
                const dx = e.clientX - swipeX.current;
                swipeX.current = null;
                if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              }}
            >
              {fw > 0 && (
                <div className={s.frame} style={{ width: fw, height: fh }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={img.id} src={img.url} alt={img.caption || data.title} draggable={false} />
                  {img.hotspots.map(h => (
                    <button
                      key={h.itemId + h.x}
                      className={s.hot}
                      style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
                      onClick={() => show(h.itemId)}
                      aria-label={`${nameOf(h.itemId)} 3D 보기`}
                    >
                      <span className={s.dot}>3D</span>
                      <span className={s.label}>{nameOf(h.itemId)} · 3D 보기</span>
                    </button>
                  ))}
                </div>
              )}
              {many && (
                <>
                  <button className={`${s.arrow} ${s.prev}`} onClick={() => go(-1)} aria-label="이전 사진">‹</button>
                  <button className={`${s.arrow} ${s.next}`} onClick={() => go(1)} aria-label="다음 사진">›</button>
                  <span className={s.counter}>{slide + 1} / {images.length}</span>
                </>
              )}
            </div>
            {img.caption && <p className={s.caption}>{img.caption}</p>}
            {many && (
              <div className={s.thumbs}>
                {images.map((im, k) => (
                  <button
                    key={im.id}
                    className={`${s.thumb} ${k === slide ? s.thumbOn : ''}`}
                    onClick={() => setSlide(k)}
                    aria-label={`${k + 1}번째 사진`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {items.length > 0 && (
          <>
            <p className={s.hint}>
              {hasHotspots ? '사진 속 3D 표시를 누르거나 아래 버튼을 누르면 3D 데이터를 돌려 보실 수 있습니다.' : '아래 버튼을 누르면 3D 데이터를 돌려 보실 수 있습니다.'}
            </p>
            <div className={s.chips}>
              {items.map(i => (
                <button key={i.id} className={s.chip} onClick={() => show(i.id)}>
                  {i.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.posterUrl} alt="" />
                  )}
                  {i.name} 3D
                </button>
              ))}
            </div>
          </>
        )}

        <footer className={s.footer}>
          이미지는 시안이며 실제 제품의 색상·비율과 다를 수 있습니다.
          <br />
          3D 데이터는 웹 확인용으로 경량화한 파일입니다. 처음 열 때 몇 초 정도 걸릴 수 있습니다.
        </footer>
      </div>

      <div
        className={`${s.modal} ${current ? s.open : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="3D 보기"
        onClick={e => { if (e.target === e.currentTarget) close(); }}
      >
        <div className={s.panel}>
          <div className={s.bar}>
            <div className={s.tabs} role="tablist">
              {items.map(i => (
                <button
                  key={i.id}
                  role="tab"
                  aria-selected={i.id === current}
                  className={s.tab}
                  onClick={() => show(i.id)}
                >
                  {i.name}
                </button>
              ))}
            </div>
            <button className={s.x} onClick={close} aria-label="닫기">✕</button>
          </div>
          <div className={s.view}>
            {createElement('model-viewer', {
              ref: bindMv,
              'camera-controls': '',
              'touch-action': 'pan-y',
              'interaction-prompt': 'none',
              'shadow-intensity': '0.8',
              'shadow-softness': '0.9',
              exposure: '1.05',
              'environment-image': 'neutral',
              'camera-orbit': '0deg 80deg auto',
              'field-of-view': '30deg',
              'auto-rotate': '',
              'auto-rotate-delay': '2500',
              'rotation-per-second': '18deg',
              loading: 'eager',
              crossorigin: 'anonymous',
              className: s.mv,
            })}
            <div className={`${s.poster} ${loaded || failed ? s.hide : ''}`}>
              {item?.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.posterUrl} alt="" />
              )}
              <div className={s.prog}><i style={{ width: `${progress}%` }} /></div>
              <small>{item ? `${item.name} 3D 데이터를 불러오는 중…` : ''}</small>
            </div>
            {failed && (
              <div className={s.err}>
                3D 데이터를 열지 못했습니다.<br />페이지를 새로고침하시거나 더젠 담당자에게 알려 주세요.
              </div>
            )}
            {loaded && anim !== 'none' && (
              <button className={s.animBtn} onClick={toggleAnim} disabled={anim === 'opening' || anim === 'closing'}>
                {anim === 'closed' ? '열어 보기' : anim === 'open' ? '닫기' : anim === 'opening' ? '여는 중…' : '닫는 중…'}
              </button>
            )}
            <div className={s.help}>드래그: 회전 · 스크롤/핀치: 확대 · 두 손가락/우클릭: 이동</div>
            <div className={s.wm}>THEXEN · 검토용</div>
          </div>
        </div>
      </div>
    </div>
  );
}
