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

    return NextResponse.json(settings);
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
    const { seasonalEffect, effectEnabled, companyImages, companyDescription, landingLogoImage, landingBackgroundImage, landingBackgroundType, landingEnterImage } = body;

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
