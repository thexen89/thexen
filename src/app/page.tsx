export const dynamic = 'force-dynamic'; 

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
  // 서버가 데이터를 먼저 확보합니다.
  const { products, settings } = await getInitialData();

  // 확보된 데이터를 클라이언트 컴포넌트에 주입합니다.
  return <HomeClient initialProducts={products} initialSettings={settings} />;
}
