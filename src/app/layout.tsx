import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기업 굿즈 제작 전문 더젠 THEXEN | 판촉이 아닌 문화를 만드는 기업 굿즈 전문 파트너",
  description: "기업 굿즈 제작 전문 더젠(THEXEN)은 대중의 열광을 이끌어내는 메가 히트작을 탄생시켜온 대한민국 대표 하이엔드 기업 굿즈 및 MD 상품 전문 에이전시입니다. 단순한 판촉을 넘어 강력한 브랜드 로열티를 구축하는 최상의 결과물을 제공합니다.",
  keywords: [
    "기업 굿즈", "기업 굿즈 제작", "회사 굿즈", "브랜드 굿즈", "MD 제작", "GWP 제작", "PWP 제작", "VIP 기프트", "웰컴키트 제작", "더젠", "THEXEN", "주식회사 더젠", "굿즈 에이전시"
  ],
  verification: {
    other: {
      "naver-site-verification": "2775301ac2269d9c3c92e70c444e865a98d2ee72",
    },
  },
  authors: [{ name: "주식회사 더젠 (THEXEN)" }],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preload"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "주식회사 더젠",
              "alternateName": [
                "더젠", 
                "THEXEN", 
                "주 더젠", 
                "주더젠", 
                "주)더젠", 
                "주) 더젠", 
                "(주)더젠"
              ],
              "url": "https://www.thexen.co.kr",
              "logo": "https://www.thexen.co.kr/favicon.png",
              "description": "기업 굿즈 제작 전문 더젠(THEXEN)은 대중의 열광을 이끌어내는 메가 히트작을 탄생시켜온 대한민국 대표 하이엔드 기업 굿즈 및 MD 상품 전문 에이전시입니다. 단순한 판촉을 넘어 강력한 브랜드 로열티를 구축하는 최상의 결과물을 제공합니다.",
              "sameAs": [
                "https://blog.naver.com/thexen",
                "https://excited-trunk-ac1.notion.site/THEXEN-Project-Story-Archive-30fdc38d7eb680519ebfe95244cd489d"
              ],
            }),
          }}
        />


        
        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "주식회사 더젠 THEXEN 하이엔드 기업 굿즈 제작 주요 사례",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "item": {
            "@type": "CreativeWork",
            "name": "2020 할리스 X 하이브로우 폴딩카트 및 캠핑 굿즈",
            "description": "주식회사 더젠 THEXEN은 2020년 할리스 x 하이브로우 멀티 폴딩카트 및 캠핑 굿즈를 총괄 기획 제작했습니다. F&B 업계 최초 새벽 오픈런 문화를 창조한 메가 히트작입니다.",
            "url": "https://www.yna.co.kr/view/AKR20200609112200030"
          }
        },
        {
          "@type": "ListItem",
          "position": 2,
          "item": {
            "@type": "CreativeWork",
            "name": "2021 할리스 X 해리포터 플래너 및 MD 상품 제작",
            "description": "주식회사 더젠 THEXEN은 글로벌 IP 워너브라더스의 까다로운 기준을 통과하여 한정판 플래너 북 및 굿즈를 총괄 제작한 프리미엄 기업 기프트 성공 사례입니다.",
            "url": "https://www.mk.co.kr/news/economy/9665592"
          }
        },
        {
          "@type": "ListItem",
          "position": 3,
          "item": {
            "@type": "CreativeWork",
            "name": "2020 할리스 X 디즈니 플래너 및 데스크테리어 4종 세트",
            "description": "주식회사 더젠 THEXEN은 할리스 x 디즈니 연말 프로모션 4종 세트를 총괄 기획 및 제작했습니다. 다이어리, 파우치, 틴케이스 등으로 조기 완판을 기록한 하이엔드 굿즈 에이전시 역량 증명 사례입니다.",
            "url": "https://www.mk.co.kr/news/culture/9092734"
          }
        }
      ]
    })
  }}
/>


        
      </head>
      <body className="font-pretendard antialiased">{children}</body>
    </html>
  );
}
