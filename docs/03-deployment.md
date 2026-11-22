# 배포 및 운영 가이드

## 환경변수

```env
# 데이터베이스 (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:pass@host:5432/postgres

# 인증
ADMIN_PASSWORD=관리자비밀번호
AUTH_SECRET=64자이상의랜덤hex문자열

# Cloudinary
CLOUDINARY_CLOUD_NAME=클라우드이름
CLOUDINARY_API_KEY=API키
CLOUDINARY_API_SECRET=API시크릿

# 거래처 3D 공유 (/v/[token], /admin/shares) — 서버 전용, NEXT_PUBLIC_ 붙이지 말 것
SUPABASE_URL=https://qrwnnstjxknwwptxqcyf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=Supabase 대시보드 > Project Settings > API Keys 의 service_role(secret) 키
```

- 거래처 공유 파일은 Supabase Storage 비공개 버킷 `shares`에 `{shareId}/파일` 형태로 저장된다.
- 관리자 업로드는 `/api/shares/upload-url`에서 받은 1회용 URL로 브라우저가 Supabase에 직접 올린다(Vercel 요청 크기 제한 회피).
- 거래처 페이지는 서버가 6시간짜리 서명 URL을 만들어 넘긴다. 만료·중지·삭제된 공유는 열리지 않는다.
- `vercel.json`의 Cron이 매일 `/api/cron/keepalive`를 호출해 무료 플랜 일시 정지를 막는다.

- `DATABASE_URL`: PgBouncer 경유 (런타임용)
- `DIRECT_URL`: 직접 연결 (마이그레이션용)

## 로컬 개발

```bash
# 의존성 설치
npm install

# DB 마이그레이션
npx prisma migrate dev

# Prisma 클라이언트 생성
npx prisma generate

# 개발 서버
npm run dev
```

## Vercel 배포

### 자동 배포 (권장)
GitHub 리포지토리를 Vercel에 연결하면 push 시 자동 배포

```bash
# 고객사 리포에 푸시 → Vercel 자동 배포
git push client main
```

### 수동 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### 빌드 설정
- **Build Command:** `prisma generate && next build`
- **Output Directory:** `.next`
- **Node.js Version:** 18+

## 데이터베이스

### Supabase PostgreSQL
- 프로젝트 대시보드: Supabase 콘솔에서 관리
- Connection Pooling 사용 (포트 6543)

### 마이그레이션
```bash
# 스키마 변경 후 마이그레이션 생성
npx prisma migrate dev --name 변경내용

# 프로덕션 마이그레이션
npx prisma migrate deploy
```

### Prisma Studio (DB 브라우저)
```bash
npx prisma studio
```

## Cloudinary

- 이미지 업로드 폴더: `thexen/`
- 자동 최적화: 모바일 그리드에서 `w_{size},h_{size},c_fill,q_auto,f_auto` 변환 적용
- 콘솔: https://console.cloudinary.com

## 캐싱 전략

| 대상 | 캐시 정책 | 설명 |
|------|-----------|------|
| `/api/products` GET | `s-maxage=60, stale-while-revalidate=300` | CDN 60초 캐시, 5분간 stale 허용 |
| `/api/settings` GET | `s-maxage=60, stale-while-revalidate=300` | 동일 |
| Cloudinary 이미지 | Cloudinary CDN 자체 캐시 | 자동 |
| Next.js Image | Next.js 이미지 최적화 캐시 | 자동 |

## 트러블슈팅

### DB 연결 실패
- `DATABASE_URL`의 `?pgbouncer=true` 확인
- Supabase 대시보드에서 DB 상태 확인

### 이미지 업로드 실패
- Cloudinary 환경변수 3개 모두 설정되었는지 확인
- 파일 크기 제한: 10MB (`next.config.ts` serverActions.bodySizeLimit)

### 어드민 로그인 안됨
- `ADMIN_PASSWORD`, `AUTH_SECRET` 환경변수 확인
- Vercel 환경변수에도 동일하게 설정되었는지 확인
