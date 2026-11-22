export interface ShareItem {
  id: string;
  name: string;
  glbPath: string;
  posterPath?: string | null;
  /** 대표 이미지 위 클릭 영역. 이미지 크기 대비 % (0~100). 없으면 이미지 위 표시 없이 버튼만 */
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
}

export interface Hotspot {
  itemId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 슬라이드 사진 한 장. 클릭 위치(hotspots)는 사진마다 따로 */
export interface ShareImage {
  id: string;
  path: string;
  width: number | null;
  height: number | null;
  caption?: string | null;
  hotspots: Hotspot[];
}

export interface ShareRecord {
  id: string;
  token: string;
  title: string;
  client: string | null;
  note: string | null;
  coverPath: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  items: ShareItem[];
  images: ShareImage[];
  expiresAt: string | null;
  revoked: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 거래처 뷰어에 넘기는 데이터 (저장 경로 대신 서명 URL만) */
export interface ViewerItem {
  id: string;
  name: string;
  glbUrl: string;
  posterUrl: string | null;
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
}

export interface ViewerImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  hotspots: Hotspot[];
}

export interface ViewerData {
  title: string;
  note: string | null;
  images: ViewerImage[];
  items: ViewerItem[];
  expiresAt: string | null;
}

/** 예전 방식(대표 이미지 1장 + 항목별 x,y,w,h)을 사진 목록으로 바꿔 읽는다 */
export function imagesOf(share: {
  images?: unknown;
  coverPath: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  items?: unknown;
}): ShareImage[] {
  const list = Array.isArray(share.images) ? (share.images as ShareImage[]) : [];
  if (list.length > 0) return list;
  if (!share.coverPath) return [];
  const items = (Array.isArray(share.items) ? share.items : []) as ShareItem[];
  return [{
    id: 'cover',
    path: share.coverPath,
    width: share.coverWidth,
    height: share.coverHeight,
    caption: null,
    hotspots: items
      .filter(i => i.w && i.h)
      .map(i => ({ itemId: i.id, x: i.x || 0, y: i.y || 0, w: i.w || 0, h: i.h || 0 })),
  }];
}
