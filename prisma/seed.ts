import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const products = [
  // 원본 19개
  { name: '프리미엄 에코백', client: '스타벅스 코리아', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '친환경 소재로 제작된 프리미엄 에코백입니다.', priority: 1 },
  { name: '브랜드 텀블러', client: '이디야커피', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '스테인리스 소재의 보온/보냉 텀블러입니다.', priority: 2 },
  { name: '키링 세트', client: '배스킨라빈스', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '아크릴 소재의 귀여운 캐릭터 키링 세트입니다.', priority: 3 },
  { name: '유니폼 앞치마', client: '파리바게뜨', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '직원용 브랜드 앞치마입니다.', priority: 4 },
  { name: '기프트 박스', client: '뚜레쥬르', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '프리미엄 선물 포장 박스입니다.', priority: 5 },
  { name: '머그컵', client: '할리스커피', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '세라믹 머그컵입니다.', priority: 6 },
  { name: '스티커 세트', client: '던킨도너츠', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '브랜드 캐릭터 스티커 세트입니다.', priority: 7 },
  { name: '쿠션', client: '맘스터치', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '브랜드 캐릭터 쿠션입니다.', priority: 8 },
  { name: '노트북 파우치', client: '공차', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '15인치 노트북용 네오프렌 파우치입니다.', priority: 9 },
  { name: '우산', client: 'BBQ치킨', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '3단 자동 우산입니다.', priority: 10 },
  { name: '에어팟 케이스', client: '네네치킨', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '실리콘 소재의 에어팟 케이스입니다.', priority: 11 },
  { name: '마스킹테이프', client: '설빙', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '다양한 패턴의 마스킹테이프 세트입니다.', priority: 12 },
  { name: '손거울', client: '이니스프리', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '휴대용 접이식 손거울입니다.', priority: 13 },
  { name: '토트백', client: '올리브영', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '캔버스 소재의 대용량 토트백입니다.', priority: 14 },
  { name: '볼펜 세트', client: '교보문고', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '고급 볼펜 3종 세트입니다.', priority: 15 },
  { name: '휴대폰 케이스', client: '카카오프렌즈', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '다양한 기종에 맞는 케이스입니다.', priority: 16 },
  { name: '담요', client: '라인프렌즈', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '극세사 소재의 무릎 담요입니다.', priority: 17 },
  { name: '마우스패드', client: '넥슨', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '게이밍 마우스패드입니다.', priority: 18 },
  { name: '파일홀더', client: 'CGV', images: ['/samples/product19.png'], thumbnailIndex: 0, description: 'A4 사이즈 클리어 파일홀더입니다.', priority: 19 },

  // 2세트 (20-38)
  { name: '리유저블 컵', client: '투썸플레이스', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '재사용 가능한 친환경 컵입니다.', priority: 20 },
  { name: '보온병', client: '폴바셋', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '진공 단열 보온병입니다.', priority: 21 },
  { name: '배지 세트', client: '나뚜루', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '에나멜 뱃지 컬렉션입니다.', priority: 22 },
  { name: '조리모자', client: '뚜레쥬르', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '위생 조리모자입니다.', priority: 23 },
  { name: '쇼핑백', client: '파리바게뜨', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '고급 종이 쇼핑백입니다.', priority: 24 },
  { name: '커피잔 세트', client: '빽다방', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '에스프레소 잔 세트입니다.', priority: 25 },
  { name: '와펜', client: '크리스피크림', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '자수 와펜 세트입니다.', priority: 26 },
  { name: '방석', client: '버거킹', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '메모리폼 방석입니다.', priority: 27 },
  { name: '태블릿 파우치', client: '쥬씨', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '11인치 태블릿용 파우치입니다.', priority: 28 },
  { name: '장우산', client: '교촌치킨', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '대형 골프 우산입니다.', priority: 29 },
  { name: '버즈 케이스', client: '굽네치킨', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '갤럭시 버즈 케이스입니다.', priority: 30 },
  { name: '포스트잇', client: '빙그레', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '브랜드 포스트잇 세트입니다.', priority: 31 },
  { name: '화장품 파우치', client: '아모레퍼시픽', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '트래블 화장품 파우치입니다.', priority: 32 },
  { name: '크로스백', client: '롭스', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '미니 크로스백입니다.', priority: 33 },
  { name: '형광펜 세트', client: '알라딘', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '파스텔 형광펜 5종입니다.', priority: 34 },
  { name: '그립톡', client: '네이버', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '스마트폰 그립톡입니다.', priority: 35 },
  { name: '슬리퍼', client: '삼성전자', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '실내용 슬리퍼입니다.', priority: 36 },
  { name: '장패드', client: '엔씨소프트', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '대형 데스크 장패드입니다.', priority: 37 },
  { name: '티켓홀더', client: '롯데시네마', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '목걸이형 티켓홀더입니다.', priority: 38 },

  // 3세트 (39-57)
  { name: '드로스트링 백', client: '블루보틀', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '조리개 파우치백입니다.', priority: 39 },
  { name: '워터보틀', client: '메가커피', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '트라이탄 워터보틀입니다.', priority: 40 },
  { name: '핀버튼', client: '콜드스톤', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '캐릭터 핀버튼 세트입니다.', priority: 41 },
  { name: '반다나', client: '써브웨이', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '브랜드 반다나입니다.', priority: 42 },
  { name: '파우치', client: '배스킨라빈스', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '다용도 지퍼 파우치입니다.', priority: 43 },
  { name: '티컵', client: '공차', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '유리 티컵입니다.', priority: 44 },
  { name: '리무버블 스티커', client: '배달의민족', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '탈부착 가능 스티커입니다.', priority: 45 },
  { name: '목베개', client: 'KFC', images: ['/samples/product8.png'], thumbnailIndex: 0, description: 'U형 목베개입니다.', priority: 46 },
  { name: '카드지갑', client: '더벤티', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '슬림 카드지갑입니다.', priority: 47 },
  { name: '비치우산', client: '피자헛', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '대형 비치 파라솔입니다.', priority: 48 },
  { name: '에어팟맥스 케이스', client: '도미노피자', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '에어팟맥스 케이스입니다.', priority: 49 },
  { name: '메모지', client: '오뚜기', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '큐브 메모지입니다.', priority: 50 },
  { name: '립밤 케이스', client: '에뛰드', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '립밤 보관 케이스입니다.', priority: 51 },
  { name: '버킷백', client: '시코르', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '미니 버킷백입니다.', priority: 52 },
  { name: '샤프 세트', client: '영풍문고', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '제도용 샤프 세트입니다.', priority: 53 },
  { name: '맥세이프 카드지갑', client: '쿠팡', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '맥세이프 카드지갑입니다.', priority: 54 },
  { name: '넥워머', client: 'LG전자', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '플리스 넥워머입니다.', priority: 55 },
  { name: '손목받침대', client: '크래프톤', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '키보드 손목받침대입니다.', priority: 56 },
  { name: '여권케이스', client: '대한항공', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '가죽 여권케이스입니다.', priority: 57 },

  // 4세트 (58-76)
  { name: '런치백', client: '탐앤탐스', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '보온 런치백입니다.', priority: 58 },
  { name: '콜드컵', client: '더리터', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '아이스 전용 콜드컵입니다.', priority: 59 },
  { name: '마그넷', client: '하겐다즈', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '냉장고 마그넷 세트입니다.', priority: 60 },
  { name: '헤어밴드', client: '맥도날드', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '위생 헤어밴드입니다.', priority: 61 },
  { name: '틴케이스', client: '허쉬', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '사탕 틴케이스입니다.', priority: 62 },
  { name: '소주잔 세트', client: '하이트진로', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '유리 소주잔 세트입니다.', priority: 63 },
  { name: '네임택', client: '요기요', images: ['/samples/product7.png'], thumbnailIndex: 0, description: 'PVC 네임택입니다.', priority: 64 },
  { name: '인형', client: '롯데리아', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '브랜드 캐릭터 인형입니다.', priority: 65 },
  { name: '안경케이스', client: '컴포즈커피', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '하드 안경케이스입니다.', priority: 66 },
  { name: '양산', client: '파파존스', images: ['/samples/product10.png'], thumbnailIndex: 0, description: 'UV 차단 양산입니다.', priority: 67 },
  { name: '애플워치 밴드', client: '미스터피자', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '실리콘 워치밴드입니다.', priority: 68 },
  { name: '달력', client: '농심', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '탁상용 달력입니다.', priority: 69 },
  { name: '브러쉬 세트', client: '미샤', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '메이크업 브러쉬 세트입니다.', priority: 70 },
  { name: '숄더백', client: '세포라', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '캔버스 숄더백입니다.', priority: 71 },
  { name: '만년필', client: '반디앤루니스', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '클래식 만년필입니다.', priority: 72 },
  { name: '스마트링', client: '토스', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '360도 스마트링입니다.', priority: 73 },
  { name: '양말 세트', client: '현대자동차', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '캐릭터 양말 3족입니다.', priority: 74 },
  { name: '케이블 정리함', client: '스마일게이트', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '데스크 케이블 정리함입니다.', priority: 75 },
  { name: '보딩패스 케이스', client: '아시아나항공', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '보딩패스 케이스입니다.', priority: 76 },

  // 5세트 (77-95)
  { name: '피크닉 매트', client: '커피빈', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '방수 피크닉 매트입니다.', priority: 77 },
  { name: '스포츠 보틀', client: '파스쿠찌', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '스퀴즈 스포츠 보틀입니다.', priority: 78 },
  { name: '아크릴 스탠드', client: '그라브르', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '캐릭터 아크릴 스탠드입니다.', priority: 79 },
  { name: '미니 앞치마', client: '쉐이크쉑', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '키즈용 미니 앞치마입니다.', priority: 80 },
  { name: '기프트카드 홀더', client: '스타벅스', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '기프트카드 홀더입니다.', priority: 81 },
  { name: '맥주잔', client: '오비맥주', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '500ml 맥주잔입니다.', priority: 82 },
  { name: '타투 스티커', client: '쿠팡이츠', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '타투 스티커 시트입니다.', priority: 83 },
  { name: '바디필로우', client: '웬디스', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '롱쿠션 바디필로우입니다.', priority: 84 },
  { name: '케이블 파우치', client: '달콤커피', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '디지털 액세서리 파우치입니다.', priority: 85 },
  { name: '우비', client: '피자알볼로', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '휴대용 우비입니다.', priority: 86 },
  { name: '갤럭시워치 밴드', client: '노브랜드버거', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '갤럭시워치 밴드입니다.', priority: 87 },
  { name: '플래너', client: '삼양식품', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '다이어리 플래너입니다.', priority: 88 },
  { name: '거울 파우치', client: '더페이스샵', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '거울 내장 파우치입니다.', priority: 89 },
  { name: '백팩', client: '랄라블라', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '미니 백팩입니다.', priority: 90 },
  { name: '노트 세트', client: '예스24', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '미니 노트 3권 세트입니다.', priority: 91 },
  { name: '차량용 거치대', client: '카카오T', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '차량용 폰 거치대입니다.', priority: 92 },
  { name: '후드담요', client: '기아자동차', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '후드 달린 담요입니다.', priority: 93 },
  { name: 'RGB 마우스패드', client: '펄어비스', images: ['/samples/product18.png'], thumbnailIndex: 0, description: 'LED 마우스패드입니다.', priority: 94 },
  { name: '러기지택', client: '제주항공', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '가죽 러기지택입니다.', priority: 95 },

  // 6세트 (96-114)
  { name: '캔버스 파우치', client: '앤티앤스', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '지퍼형 캔버스 파우치입니다.', priority: 96 },
  { name: '스트로우 세트', client: '쥬스식스', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '스테인리스 빨대 세트입니다.', priority: 97 },
  { name: '뱃지 홀더', client: '아웃백', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '직원용 뱃지 홀더입니다.', priority: 98 },
  { name: '주방장갑', client: 'VIPS', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '내열 주방장갑입니다.', priority: 99 },
  { name: '선물세트 박스', client: '빕스', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '프리미엄 선물세트 박스입니다.', priority: 100 },
  { name: '와인잔 세트', client: '매드포갈릭', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '크리스탈 와인잔 세트입니다.', priority: 101 },
  { name: '책갈피 세트', client: '인터파크', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '금속 책갈피 세트입니다.', priority: 102 },
  { name: '등받이 쿠션', client: '애슐리', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '메모리폼 등받이입니다.', priority: 103 },
  { name: '멀티파우치', client: '할리스', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '다용도 멀티파우치입니다.', priority: 104 },
  { name: '레인코트', client: '피자마루', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '성인용 레인코트입니다.', priority: 105 },
  { name: '스마트워치 스트랩', client: '59쌀피자', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '나일론 워치 스트랩입니다.', priority: 106 },
  { name: '탁상 캘린더', client: 'CJ제일제당', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '아트 탁상 캘린더입니다.', priority: 107 },
  { name: '립글로스 세트', client: '클리오', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '미니 립글로스 세트입니다.', priority: 108 },
  { name: '클러치백', client: '어퓨', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '레더 클러치백입니다.', priority: 109 },
  { name: '색연필 세트', client: '모닝글로리', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '24색 색연필 세트입니다.', priority: 110 },
  { name: '무선충전기', client: '당근마켓', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '고속 무선충전기입니다.', priority: 111 },
  { name: '플리스 자켓', client: '볼보코리아', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '경량 플리스 자켓입니다.', priority: 112 },
  { name: '모니터 스탠드', client: '웹젠', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '높이조절 모니터 스탠드입니다.', priority: 113 },
  { name: '기내용 파우치', client: '진에어', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '기내용 어메니티 파우치입니다.', priority: 114 },

  // 7세트 (115-133)
  { name: '보냉백', client: '카페베네', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '대용량 보냉백입니다.', priority: 115 },
  { name: '시즌 텀블러', client: '이디야', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '시즌 한정 텀블러입니다.', priority: 116 },
  { name: '포토카드 세트', client: '하이브', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '콜렉터 포토카드입니다.', priority: 117 },
  { name: '토크 세트', client: '본죽', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '조리용 토크모자입니다.', priority: 118 },
  { name: '페이퍼백', client: '놀부', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '친환경 페이퍼백입니다.', priority: 119 },
  { name: '커피 드리퍼', client: '테라로사', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '핸드드립 드리퍼입니다.', priority: 120 },
  { name: '데코 스티커', client: '무신사', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '노트북 데코 스티커입니다.', priority: 121 },
  { name: '허리쿠션', client: '청년피자', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '인체공학 허리쿠션입니다.', priority: 122 },
  { name: '세면파우치', client: '스무디킹', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '방수 세면파우치입니다.', priority: 123 },
  { name: '투명우산', client: '한솥도시락', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '투명 돔형 우산입니다.', priority: 124 },
  { name: 'AirTag 케이스', client: '봉구스밥버거', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '가죽 에어태그 케이스입니다.', priority: 125 },
  { name: '스티커 북', client: '해태제과', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '캐릭터 스티커 북입니다.', priority: 126 },
  { name: '틴트 세트', client: '스킨푸드', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '미니 틴트 세트입니다.', priority: 127 },
  { name: '웨이스트백', client: '왓슨스', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '스포티 웨이스트백입니다.', priority: 128 },
  { name: '연필깎이', client: '오피스디포', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '전동 연필깎이입니다.', priority: 129 },
  { name: '보조배터리', client: '배민커넥트', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '미니 보조배터리입니다.', priority: 130 },
  { name: '니트 장갑', client: 'BMW코리아', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '터치스크린 니트장갑입니다.', priority: 131 },
  { name: '데스크 오거나이저', client: '넷마블', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '데스크 정리함입니다.', priority: 132 },
  { name: '트래블 키트', client: '에어부산', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '여행용 키트 세트입니다.', priority: 133 },

  // 8세트 (134-152)
  { name: '도시락 가방', client: '엔제리너스', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '보온 도시락 가방입니다.', priority: 134 },
  { name: '콜라보 텀블러', client: '투썸', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '아티스트 콜라보 텀블러입니다.', priority: 135 },
  { name: '럭키드로우 티켓', client: 'SM엔터', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '럭키드로우 응모권입니다.', priority: 136 },
  { name: '위생모', client: '김밥천국', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '일회용 위생모입니다.', priority: 137 },
  { name: '리본 박스', client: '고디바', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '리본 장식 선물박스입니다.', priority: 138 },
  { name: '샷잔 세트', client: '조니워커', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '미니 샷잔 세트입니다.', priority: 139 },
  { name: '홀로그램 스티커', client: '29CM', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '홀로그램 스티커 팩입니다.', priority: 140 },
  { name: '캐릭터 슬리퍼', client: '파파이스', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '캐릭터 실내화입니다.', priority: 141 },
  { name: '여행용 파우치 세트', client: '더착한커피', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '여행용 파우치 3종입니다.', priority: 142 },
  { name: '폴딩 우산', client: '샐러디', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '초경량 폴딩 우산입니다.', priority: 143 },
  { name: '갤럭시버즈 케이스', client: '치킨플러스', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '하드케이스 버즈 케이스입니다.', priority: 144 },
  { name: '벽걸이 달력', client: '롯데제과', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '벽걸이 아트 달력입니다.', priority: 145 },
  { name: '쿠션팩트 케이스', client: '홀리카홀리카', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '리필용 팩트 케이스입니다.', priority: 146 },
  { name: '미니 숄더백', client: '부츠', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '체인 미니백입니다.', priority: 147 },
  { name: '지우개 세트', client: '아트박스', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '캐릭터 지우개 세트입니다.', priority: 148 },
  { name: 'C타입 케이블', client: '직방', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '고속충전 케이블입니다.', priority: 149 },
  { name: '비니', client: '벤츠코리아', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '울 비니입니다.', priority: 150 },
  { name: '헤드폰 스탠드', client: '데브시스터즈', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '알루미늄 헤드폰 거치대입니다.', priority: 151 },
  { name: '목베개 세트', client: '티웨이항공', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '기내용 목베개 세트입니다.', priority: 152 },

  // 9세트 (153-171)
  { name: '런치 토트', client: '드롭탑', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '런치 토트백입니다.', priority: 153 },
  { name: '리유저블 머그', client: '폴스타', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '친환경 리유저블 머그입니다.', priority: 154 },
  { name: '슬로건 타월', client: 'JYP엔터', images: ['/samples/product3.png'], thumbnailIndex: 0, description: '응원 슬로건 타월입니다.', priority: 155 },
  { name: '삼각두건', client: '죠스떡볶이', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '조리용 삼각두건입니다.', priority: 156 },
  { name: '원형 틴케이스', client: '페레로로쉐', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '원형 초콜릿 틴케이스입니다.', priority: 157 },
  { name: '칵테일잔', client: '발렌타인', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '마티니 글라스입니다.', priority: 158 },
  { name: '씰스티커', client: '오늘의집', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '봉투 씰스티커입니다.', priority: 159 },
  { name: '뽀글이 담요', client: '맥스웰하우스', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '양털 뽀글이 담요입니다.', priority: 160 },
  { name: '가젯파우치', client: '더카페', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '전자기기 파우치입니다.', priority: 161 },
  { name: '5단 우산', client: '굽네치킨', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '초소형 5단 우산입니다.', priority: 162 },
  { name: '갤럭시링 케이스', client: '푸라닭', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '갤럭시링 충전케이스입니다.', priority: 163 },
  { name: '포켓 캘린더', client: '크라운제과', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '포켓 사이즈 캘린더입니다.', priority: 164 },
  { name: '핸드크림 세트', client: '네이처리퍼블릭', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '미니 핸드크림 3종입니다.', priority: 165 },
  { name: '에코 장바구니', client: '다이소', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '접이식 장바구니입니다.', priority: 166 },
  { name: '스탬프', client: '문구야놀자', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '캐릭터 스탬프 세트입니다.', priority: 167 },
  { name: '맥세이프 충전기', client: '야놀자', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '맥세이프 무선충전기입니다.', priority: 168 },
  { name: '캠핑 담요', client: '아우디코리아', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '캠핑용 방수담요입니다.', priority: 169 },
  { name: '웹캠 커버', client: '카카오게임즈', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '프라이버시 웹캠 커버입니다.', priority: 170 },
  { name: '비행기 모형', client: '대한항공', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '미니어처 비행기 모형입니다.', priority: 171 },

  // 10세트 (172-190)
  { name: '쿨러백', client: '빽다방', images: ['/samples/product1.png'], thumbnailIndex: 0, description: '아이스박스 쿨러백입니다.', priority: 172 },
  { name: '한정판 텀블러', client: '스타벅스', images: ['/samples/product2.png'], thumbnailIndex: 0, description: '시즌 한정 텀블러입니다.', priority: 173 },
  { name: '응원봉', client: 'YG엔터', images: ['/samples/product3.png'], thumbnailIndex: 0, description: 'LED 응원봉입니다.', priority: 174 },
  { name: '팔토시', client: '명륜진사갈비', images: ['/samples/product4.png'], thumbnailIndex: 0, description: '조리용 팔토시입니다.', priority: 175 },
  { name: '미니 선물박스', client: '린트', images: ['/samples/product5.png'], thumbnailIndex: 0, description: '미니 사이즈 선물박스입니다.', priority: 176 },
  { name: '하이볼잔', client: '짐빔', images: ['/samples/product6.png'], thumbnailIndex: 0, description: '하이볼 글라스입니다.', priority: 177 },
  { name: '리워드 스티커', client: '클래스101', images: ['/samples/product7.png'], thumbnailIndex: 0, description: '칭찬 리워드 스티커입니다.', priority: 178 },
  { name: '바디쿠션', client: '맥도날드', images: ['/samples/product8.png'], thumbnailIndex: 0, description: '캐릭터 바디쿠션입니다.', priority: 179 },
  { name: '트래블 월렛', client: '메가커피', images: ['/samples/product9.png'], thumbnailIndex: 0, description: '여행용 지갑입니다.', priority: 180 },
  { name: '자동 우산', client: 'bhc치킨', images: ['/samples/product10.png'], thumbnailIndex: 0, description: '원터치 자동 우산입니다.', priority: 181 },
  { name: 'AirPods Pro 케이스', client: '또래오래', images: ['/samples/product11.png'], thumbnailIndex: 0, description: '에어팟프로 케이스입니다.', priority: 182 },
  { name: '데스크 캘린더', client: '동원F&B', images: ['/samples/product12.png'], thumbnailIndex: 0, description: '입체 데스크 캘린더입니다.', priority: 183 },
  { name: '시트마스크 세트', client: '메디힐', images: ['/samples/product13.png'], thumbnailIndex: 0, description: '보습 마스크팩 세트입니다.', priority: 184 },
  { name: '폴더블 백', client: '이마트24', images: ['/samples/product14.png'], thumbnailIndex: 0, description: '접이식 쇼핑백입니다.', priority: 185 },
  { name: '테이프 디스펜서', client: '핫트랙스', images: ['/samples/product15.png'], thumbnailIndex: 0, description: '미니 테이프 커터입니다.', priority: 186 },
  { name: '3in1 충전케이블', client: '마켓컬리', images: ['/samples/product16.png'], thumbnailIndex: 0, description: '3in1 멀티 케이블입니다.', priority: 187 },
  { name: '패딩 조끼', client: '테슬라코리아', images: ['/samples/product17.png'], thumbnailIndex: 0, description: '경량 패딩 조끼입니다.', priority: 188 },
  { name: 'USB 허브', client: '컴투스', images: ['/samples/product18.png'], thumbnailIndex: 0, description: '4포트 USB 허브입니다.', priority: 189 },
  { name: '패스포트 월렛', client: '이스타항공', images: ['/samples/product19.png'], thumbnailIndex: 0, description: '여권 지갑입니다.', priority: 190 },
];

async function main() {
  console.log('Seeding database...');

  // 기존 데이터 삭제
  await prisma.product.deleteMany();

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log(`Seeding completed! ${products.length} products created.`);
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
