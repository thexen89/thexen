import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const products = [
  {
    name: '프리미엄 에코백',
    client: '스타벅스 코리아',
    image: '/samples/product1.png',
    description: '친환경 소재로 제작된 프리미엄 에코백입니다. 내구성이 뛰어나며 세탁이 가능합니다.',
    priority: 7,
    shape: 'circle',
  },
  {
    name: '브랜드 텀블러',
    client: '이디야커피',
    image: '/samples/product2.png',
    description: '스테인리스 소재의 보온/보냉 텀블러입니다. 로고 각인 및 풀컬러 인쇄 가능합니다.',
    priority: 2,
  },
  {
    name: '키링 세트',
    client: '배스킨라빈스',
    image: '/samples/product3.png',
    description: '아크릴 소재의 귀여운 캐릭터 키링 세트입니다. 다양한 디자인 커스터마이징이 가능합니다.',
    priority: 1,
  },
  {
    name: '유니폼 앞치마',
    client: '파리바게뜨',
    image: '/samples/product4.png',
    description: '직원용 브랜드 앞치마입니다. 방수 코팅 및 자수 로고 포함됩니다.',
    priority: 3,
  },
  {
    name: '기프트 박스',
    client: '뚜레쥬르',
    image: '/samples/product5.png',
    description: '프리미엄 선물 포장 박스입니다. 고급스러운 마감과 브랜드 로고 인쇄가 포함됩니다.',
    priority: 4,
  },
  {
    name: '머그컵',
    client: '할리스커피',
    image: '/samples/product6.png',
    description: '세라믹 머그컵입니다. 식기세척기 사용 가능하며 다양한 용량으로 제작됩니다.',
    priority: 5,
  },
  {
    name: '스티커 세트',
    client: '던킨도너츠',
    image: '/samples/product7.png',
    description: '브랜드 캐릭터 스티커 세트입니다. 방수 코팅으로 내구성이 뛰어납니다.',
    priority: 6,
  },
  {
    name: '쿠션',
    client: '맘스터치',
    image: '/samples/product8.png',
    description: '브랜드 캐릭터 쿠션입니다. 부드러운 마이크로 극세사 소재를 사용했습니다.',
    priority: 8,
  },
  {
    name: '노트북 파우치',
    client: '공차',
    image: '/samples/product9.png',
    description: '15인치 노트북용 네오프렌 파우치입니다. 충격 흡수 및 방수 기능이 있습니다.',
    priority: 9,
  },
  {
    name: '우산',
    client: 'BBQ치킨',
    image: '/samples/product10.png',
    description: '3단 자동 우산입니다. 브랜드 컬러와 로고가 적용되었습니다.',
    priority: 10,
  },
  {
    name: '에어팟 케이스',
    client: '네네치킨',
    image: '/samples/product11.png',
    description: '실리콘 소재의 에어팟 케이스입니다. 캐릭터 디자인과 브랜드 로고가 포함됩니다.',
    priority: 11,
  },
  {
    name: '마스킹테이프',
    client: '설빙',
    image: '/samples/product12.png',
    description: '다양한 패턴의 마스킹테이프 세트입니다. 브랜드 아이덴티티를 반영한 디자인입니다.',
    priority: 12,
  },
  {
    name: '손거울',
    client: '이니스프리',
    image: '/samples/product13.png',
    description: '휴대용 접이식 손거울입니다. 양면 거울이며 확대경 기능이 있습니다.',
    priority: 13,
  },
  {
    name: '토트백',
    client: '올리브영',
    image: '/samples/product14.png',
    description: '캔버스 소재의 대용량 토트백입니다. 내부 포켓과 지퍼가 포함되어 있습니다.',
    priority: 14,
  },
  {
    name: '볼펜 세트',
    client: '교보문고',
    image: '/samples/product15.png',
    description: '고급 볼펜 3종 세트입니다. 로고 각인이 가능하며 선물용 케이스가 포함됩니다.',
    priority: 15,
  },
  {
    name: '휴대폰 케이스',
    client: '카카오프렌즈',
    image: '/samples/product16.png',
    description: '다양한 기종에 맞는 하드/소프트 케이스입니다. 풀컬러 UV 인쇄가 가능합니다.',
    priority: 16,
  },
  {
    name: '담요',
    client: '라인프렌즈',
    image: '/samples/product17.png',
    description: '극세사 소재의 무릎 담요입니다. 캐릭터 자수 및 태그 부착이 가능합니다.',
    priority: 17,
  },
  {
    name: '마우스패드',
    client: '넥슨',
    image: '/samples/product18.png',
    description: '게이밍 마우스패드입니다. 미끄럼 방지 고무 베이스와 정밀 표면 처리가 되어 있습니다.',
    priority: 18,
  },
  {
    name: '파일홀더',
    client: 'CGV',
    image: '/samples/product19.png',
    description: 'A4 사이즈 클리어 파일홀더입니다. 영화 포스터 디자인으로 제작되었습니다.',
    priority: 19,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
