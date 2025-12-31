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
    const { seasonalEffect, effectEnabled } = body;

    const settings = await prisma.siteSettings.upsert({
      where: { id: DEFAULT_ID },
      update: {
        seasonalEffect,
        effectEnabled,
      },
      create: {
        id: DEFAULT_ID,
        seasonalEffect,
        effectEnabled,
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
