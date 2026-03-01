import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { priority: 'asc' },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error reading products:', error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const maxPriority = await prisma.product.aggregate({
      _max: { priority: true },
    });

    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        client: body.client,
        images: body.images || [],
        imageAlts: body.imageAlts || [],
        thumbnailIndex: body.thumbnailIndex || 0,
        description: body.description,
        priority: body.priority || (maxPriority._max.priority || 0) + 1,
        shape: body.shape,
        showInfo: body.showInfo || false,
        videoUrl: body.videoUrl || null,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const updatedProduct = await prisma.product.update({
      where: { id: body.id },
      data: {
        name: body.name,
        client: body.client,
        images: body.images,
        imageAlts: body.imageAlts || [],
        thumbnailIndex: body.thumbnailIndex,
        description: body.description,
        priority: body.priority,
        shape: body.shape,
        showInfo: body.showInfo ?? false,
        videoUrl: body.videoUrl ?? null,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
