# THEXEN 프로젝트 아키텍처

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 15 |
| UI 라이브러리 | React | 19 |
| 언어 | TypeScript | 5 |
| 스타일링 | Tailwind CSS | 4 |
| ORM | Prisma | 6 |
| 데이터베이스 | PostgreSQL (Supabase) | - |
| 이미지 호스팅 | Cloudinary | - |
| 배포 | Vercel | - |
| 폰트 | Pretendard (CDN) | 1.3.9 |

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 페이지 (랜딩 + 포트폴리오 그리드)
│   ├── layout.tsx            # 루트 레이아웃 (폰트, 메타데이터)
│   ├── globals.css           # 전역 스타일
│   ├── admin/
│   │   ├── page.tsx          # 관리자 대시보드
│   │   └── login/page.tsx    # 관리자 로그인
│   └── api/
│       ├── auth/             # 인증 (login, logout)
│       ├── products/         # 제품 CRUD + 순서변경
│       ├── settings/         # 사이트 설정
│       └── upload/           # Cloudinary 이미지 업로드/삭제
├── components/
│   ├── HexGrid.tsx           # PC 헥사곤 그리드 (React + CSS)
│   ├── MobileHexGrid.tsx     # 모바일 버블 그리드 (Canvas API)
│   ├── AdminHexGrid.tsx      # 어드민 PC 그리드 (드래그 순서변경)
│   ├── AdminMobileHexGrid.tsx# 어드민 모바일 그리드
│   ├── Modal.tsx             # 제품 상세 모달
│   ├── CompanyModal.tsx      # 회사 소개 모달
│   ├── SeasonalEffects.tsx   # 시즌 이펙트 (눈, 벚꽃, 낙엽, 불꽃)
│   └── ErrorBoundary.tsx     # 에러 바운더리
├── lib/
│   ├── prisma.ts             # Prisma 클라이언트 싱글톤
│   ├── auth.ts               # JWT 토큰 생성/검증
│   ├── types.ts              # TypeScript 타입 정의
│   └── hexLayout.ts          # 헥사곤 좌표 계산
├── hooks/
│   └── useFullscreenLandscape.ts
├── middleware.ts              # 인증 미들웨어
└── data/
    └── products.json          # 샘플 데이터
```

## 페이지 흐름

```
사용자 진입
    │
    ▼
[랜딩 페이지] ──클릭──▶ [수렴 애니메이션 400ms] ──▶ [펼침 애니메이션 600ms] ──▶ [포트폴리오 그리드]
    ▲                                                                              │
    │                                                                              │
    └──────────────────── 5분 미활동 자동복귀 ◀──────────────────────────────────────┘
                                                                                   │
                                                                              제품 클릭
                                                                                   │
                                                                                   ▼
                                                                          [제품 상세 모달]
                                                                        (이미지 갤러리/영상)
```

## 반응형 분기

- **PC (≥768px)**: `HexGrid` 컴포넌트 (React + CSS, 마우스 hover 확대 효과)
- **모바일 (<768px)**: `MobileHexGrid` 컴포넌트 (Canvas API, 관성 스크롤, 3-4-3-4 패턴)
