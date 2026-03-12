# API 레퍼런스

모든 상태 변경 API(POST/PUT/DELETE)는 인증 필요 (`admin_session` 쿠키)

## 인증

### POST `/api/auth/login`
비밀번호로 로그인, 세션 쿠키 발급

**Request Body:**
```json
{ "password": "관리자비밀번호" }
```

**Response:**
- `200` — `{ "success": true }` + `admin_session` 쿠키 설정 (24시간)
- `401` — `{ "error": "Invalid password" }`

### POST `/api/auth/logout`
세션 쿠키 삭제

**Response:**
- `200` — `{ "success": true }`

---

## 제품

### GET `/api/products`
전체 제품 목록 (priority 오름차순)

**Response:**
```json
{
  "products": [
    {
      "id": "cuid",
      "name": "제품명",
      "client": "고객사",
      "images": ["https://res.cloudinary.com/..."],
      "imageAlts": ["대체텍스트"],
      "thumbnailIndex": 0,
      "description": "설명",
      "priority": 1,
      "shape": "circle",
      "showInfo": false,
      "videoUrl": "https://youtube.com/...",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

**캐시:** `s-maxage=60, stale-while-revalidate=300`

### POST `/api/products`
제품 생성

**Request Body:**
```json
{
  "name": "제품명",
  "client": "고객사",
  "images": ["url1", "url2"],
  "imageAlts": ["alt1", "alt2"],
  "thumbnailIndex": 0,
  "description": "설명",
  "priority": 1,
  "shape": "circle",
  "showInfo": false,
  "videoUrl": null
}
```

### PUT `/api/products`
제품 수정 (id 필수)

**Request Body:** POST와 동일 + `"id": "제품ID"`

### DELETE `/api/products?id={제품ID}`
제품 삭제

### PUT `/api/products/reorder`
제품 순서 일괄 변경

**Request Body:**
```json
{
  "products": [
    { "id": "id1", "priority": 1 },
    { "id": "id2", "priority": 2 }
  ]
}
```

---

## 사이트 설정

### GET `/api/settings`
현재 사이트 설정 조회

**Response:**
```json
{
  "id": "default",
  "seasonalEffect": "snow",
  "effectEnabled": true,
  "companyImages": ["url1"],
  "companyDescription": "회사 소개",
  "landingLogoImage": "url",
  "landingBackgroundImage": "url",
  "landingBackgroundType": "tile",
  "landingEnterImage": "url",
  "gridBackgroundColor": "#000000",
  "headerLogoImage": "url",
  "externalLinks": [{ "image": "url", "url": "https://..." }],
  "leftPanelPositionX": 50,
  "leftPanelPositionY": 50,
  "rightPanelPositionX": 50,
  "rightPanelPositionY": 50
}
```

**캐시:** `s-maxage=60, stale-while-revalidate=300`

### PUT `/api/settings`
설정 업데이트 (전달된 필드만 변경)

---

## 이미지 업로드

### POST `/api/upload`
Cloudinary에 이미지 업로드

**Request Body:** `FormData`
- `file` — 이미지 파일

**Response:**
```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "thexen/filename"
}
```

### DELETE `/api/upload?publicId={publicId}`
Cloudinary에서 이미지 삭제
