import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid products data' }, { status: 400 });
    }

    // Update priorities using transaction with extended timeout
    await prisma.$transaction(
      products.map((product: { id: string; priority: number }) =>
        prisma.product.update({
          where: { id: product.id },
          data: { priority: product.priority },
        })
      ),
      {
        timeout: 30000, // 30초 타임아웃
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering products:', error);
    return NextResponse.json({ error: 'Failed to reorder products' }, { status: 500 });
  }
}
