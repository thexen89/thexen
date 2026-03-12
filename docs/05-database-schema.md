# 데이터베이스 스키마

## Product 테이블

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | String (CUID) | 자동생성 | PK |
| `name` | String | - | 제품명 |
| `client` | String | - | 고객사명 |
| `images` | String[] | - | Cloudinary 이미지 URL 배열 |
| `imageAlts` | String[] | - | 이미지 대체 텍스트 배열 |
| `thumbnailIndex` | Int | 0 | 그리드 썸네일로 사용할 이미지 인덱스 |
| `description` | String | - | 제품 설명 |
| `priority` | Int | - | 표시 순서 (낮을수록 먼저) |
| `shape` | String? | null | 그리드 모양 (`hexagon`, `circle`) |
| `showInfo` | Boolean | false | 그리드에서 정보 표시 여부 |
| `videoUrl` | String? | null | YouTube/Vimeo 임베드 URL |
| `createdAt` | DateTime | now() | 생성일시 |
| `updatedAt` | DateTime | auto | 수정일시 |

## SiteSettings 테이블

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | String | "default" | PK (단일 레코드) |
| `seasonalEffect` | String? | null | 시즌 이펙트 (`snow`/`cherry`/`leaves`/`fireworks`) |
| `effectEnabled` | Boolean | false | 이펙트 활성화 |
| `companyImages` | String[] | [] | 회사 소개 이미지 URLs |
| `companyDescription` | String? | null | 회사 소개 텍스트 |
| `landingLogoImage` | String? | null | 랜딩 로고 이미지 |
| `landingBackgroundImage` | String? | null | 랜딩 배경 이미지 |
| `landingBackgroundType` | String? | "tile" | 배경 타입 (`tile`/`cover`) |
| `landingEnterImage` | String? | null | Enter 버튼 이미지 |
| `gridBackgroundColor` | String? | null | 그리드 배경색 (HEX) |
| `headerLogoImage` | String? | null | 헤더 로고 이미지 |
| `externalLinks` | Json? | null | 외부 링크 `[{image, url}]` |
| `leftPanelPositionX` | Int | 50 | 좌측 패널 X 위치 (0-100) |
| `leftPanelPositionY` | Int | 50 | 좌측 패널 Y 위치 (0-100) |
| `rightPanelPositionX` | Int | 50 | 우측 패널 X 위치 (0-100) |
| `rightPanelPositionY` | Int | 50 | 우측 패널 Y 위치 (0-100) |
| `updatedAt` | DateTime | auto | 수정일시 |

## ER 다이어그램

```
┌─────────────────────┐     ┌─────────────────────────┐
│      Product        │     │     SiteSettings        │
├─────────────────────┤     ├─────────────────────────┤
│ id (PK)             │     │ id (PK) = "default"     │
│ name                │     │ seasonalEffect          │
│ client              │     │ effectEnabled           │
│ images[]            │     │ companyImages[]          │
│ imageAlts[]         │     │ companyDescription       │
│ thumbnailIndex      │     │ landingLogoImage         │
│ description         │     │ landingBackgroundImage   │
│ priority            │     │ landingBackgroundType    │
│ shape               │     │ landingEnterImage        │
│ showInfo            │     │ gridBackgroundColor      │
│ videoUrl            │     │ headerLogoImage          │
│ createdAt           │     │ externalLinks (JSON)     │
│ updatedAt           │     │ leftPanelPosition X/Y    │
└─────────────────────┘     │ rightPanelPosition X/Y   │
                            │ updatedAt                │
                            └─────────────────────────┘
```

두 테이블은 독립적 (관계 없음). SiteSettings는 항상 단일 레코드 (`id = "default"`).
