import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src/data/products.json');

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid products data' }, { status: 400 });
    }

    // Read existing data
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const json = JSON.parse(data);

    // Update priorities for each product
    products.forEach((updatedProduct: { id: string; priority: number }) => {
      const index = json.products.findIndex((p: { id: string }) => p.id === updatedProduct.id);
      if (index !== -1) {
        json.products[index].priority = updatedProduct.priority;
      }
    });

    // Write updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(json, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering products:', error);
    return NextResponse.json({ error: 'Failed to reorder products' }, { status: 500 });
  }
}
