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

export interface ViewerData {
  title: string;
  note: string | null;
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  items: ViewerItem[];
  expiresAt: string | null;
}
