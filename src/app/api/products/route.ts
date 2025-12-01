import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src/data/products.json');

export async function GET() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const json = JSON.parse(data);
    return NextResponse.json(json);
  } catch (error) {
    console.error('Error reading products:', error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const json = JSON.parse(data);

    const newProduct = {
      id: Date.now().toString(),
      name: body.name,
      client: body.client,
      image: body.image,
      description: body.description,
      priority: body.priority || json.products.length + 1,
      createdAt: new Date().toISOString().split('T')[0],
    };

    json.products.push(newProduct);
    fs.writeFileSync(DATA_FILE, JSON.stringify(json, null, 2));

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const json = JSON.parse(data);

    const index = json.products.findIndex((p: { id: string }) => p.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    json.products[index] = { ...json.products[index], ...body };
    fs.writeFileSync(DATA_FILE, JSON.stringify(json, null, 2));

    return NextResponse.json(json.products[index]);
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

    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const json = JSON.parse(data);

    json.products = json.products.filter((p: { id: string }) => p.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(json, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
