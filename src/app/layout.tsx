import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "더젠 THEXEN | 소모품이 아닌 소장품을, 판촉이 아닌 문화를 만드는 굿즈 전문 파트너",
  description: "주식회사 더젠 THEXEN은 대중의 열광을 이끌어내는 메가 히트작을 탄생시켜온 대한민국 대표 하이엔드 굿즈 및 엠디 상품 전문 에이전시입니다. 한철 쓰이고 버려지는 소모품을 거부하고 고품질 라이프스타일 상품 제작을 통해 기업의 정체성을 실물화하며 강력한 브랜드 로열티를 구축하는 최상의 기업 프로모션 GWP 결과물을 제공합니다.",
  keywords: [
    "더젠", "THEXEN", "주식회사 더젠", 
    "기업 GWP", "프로모션", "기업 마케팅", 
    "굿즈 제작", "브랜드 MD", "B2B PWP", "기프트 제작"
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
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard antialiased">{children}</body>
    </html>
  );
}
