import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_ID = 'default';

// GET - 설정 조회
export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: DEFAULT_ID },
    });

    // 설정이 없으면 기본값 생성
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: DEFAULT_ID,
          seasonalEffect: null,
          effectEnabled: false,
          companyImages: [],
          companyDescription: null,
        },
      });
    }

    const response = NextResponse.json(settings);
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - 설정 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { seasonalEffect, effectEnabled, companyImages, companyDescription, landingLogoImage, landingBackgroundImage, landingBackgroundType, landingEnterImage, gridBackgroundColor, headerLogoImage, externalLinks, leftPanelPositionX, leftPanelPositionY, rightPanelPositionX, rightPanelPositionY } = body;

    // 업데이트할 데이터 구성 (전달된 필드만 업데이트)
    const updateData: Record<string, unknown> = {};
    if (seasonalEffect !== undefined) updateData.seasonalEffect = seasonalEffect;
    if (effectEnabled !== undefined) updateData.effectEnabled = effectEnabled;
    if (companyImages !== undefined) updateData.companyImages = companyImages;
    if (companyDescription !== undefined) updateData.companyDescription = companyDescription;
    if (landingLogoImage !== undefined) updateData.landingLogoImage = landingLogoImage;
    if (landingBackgroundImage !== undefined) updateData.landingBackgroundImage = landingBackgroundImage;
    if (landingBackgroundType !== undefined) updateData.landingBackgroundType = landingBackgroundType;
    if (landingEnterImage !== undefined) updateData.landingEnterImage = landingEnterImage;
    if (gridBackgroundColor !== undefined) updateData.gridBackgroundColor = gridBackgroundColor;
    if (headerLogoImage !== undefined) updateData.headerLogoImage = headerLogoImage;
    if (externalLinks !== undefined) updateData.externalLinks = externalLinks;
    if (leftPanelPositionX !== undefined) updateData.leftPanelPositionX = leftPanelPositionX;
    if (leftPanelPositionY !== undefined) updateData.leftPanelPositionY = leftPanelPositionY;
    if (rightPanelPositionX !== undefined) updateData.rightPanelPositionX = rightPanelPositionX;
    if (rightPanelPositionY !== undefined) updateData.rightPanelPositionY = rightPanelPositionY;

    const settings = await prisma.siteSettings.upsert({
      where: { id: DEFAULT_ID },
      update: updateData,
      create: {
        id: DEFAULT_ID,
        seasonalEffect: seasonalEffect ?? null,
        effectEnabled: effectEnabled ?? false,
        companyImages: companyImages ?? [],
        companyDescription: companyDescription ?? null,
        landingLogoImage: landingLogoImage ?? null,
        landingBackgroundImage: landingBackgroundImage ?? null,
        landingBackgroundType: landingBackgroundType ?? 'tile',
        landingEnterImage: landingEnterImage ?? null,
        gridBackgroundColor: gridBackgroundColor ?? null,
        headerLogoImage: headerLogoImage ?? null,
        externalLinks: externalLinks ?? null,
        leftPanelPositionX: leftPanelPositionX ?? 50,
        leftPanelPositionY: leftPanelPositionY ?? 50,
        rightPanelPositionX: rightPanelPositionX ?? 50,
        rightPanelPositionY: rightPanelPositionY ?? 50,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
