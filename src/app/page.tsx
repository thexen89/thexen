import HomeClient from './HomeClient';

async function getInitialData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thexen.co.kr';
  
  try {
    const [productsRes, settingsRes] = await Promise.all([
      fetch(`${baseUrl}/api/products`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/settings`, { next: { revalidate: 3600 } })
    ]);

    const productsData = await productsRes.json();
    const settingsData = await settingsRes.json();

    return {
      products: productsData.products || [],
      settings: settingsData || {}
    };
  } catch (error) {
    console.error("SSR Data Fetch Failed:", error);
    return { products: [], settings: {} };
  }
}

export default async function Page() {
  // 1. 서버가 수파베이스 DB에서 데이터를 먼저 확보합니다.
  const { products, settings } = await getInitialData();

  // 2. 확보된 데이터를 가지고 화면을 그립니다.
  return (
    <>
      {/* 사용자의 눈에 보이는 화려한 메인 화면 */}
      <HomeClient initialProducts={products} initialSettings={settings} />
      
      {/* 💡 [SEO 최종 진화] 구글 로봇이 사이트 접속하자마자 자바스크립트 연산 없이 0.1초 만에 긁어가는 순수 텍스트 블록 (화면엔 안 보임) */}
      <div className="sr-only">
        <h2>더젠(THEXEN) 프리미엄 굿즈 제작 주요 포트폴리오</h2>
        <ul>
          {products.map((product: any) => (
            <li key={product.id}>
              <h3>{product.name}</h3>
              <p><strong>클라이언트:</strong> {product.client}</p>
              {product.description && <p><strong>상세 설명:</strong> {product.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
