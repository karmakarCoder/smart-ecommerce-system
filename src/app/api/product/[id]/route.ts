import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// /api/product/[id] - Get product details

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductById(id);

    return NextResponse.json(
      { message: "Product details retrieved successfully", data: product },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// /api/product/[id] - Update a product
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const { origin } = new URL(request.url);

    const updatedProduct = await ProductService.updateProduct(
      id,
      formData,
      origin,
    );

    return NextResponse.json(
      { message: "Product updated successfully", data: updatedProduct },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// /api/product/[id] - Delete a product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await ProductService.deleteProduct(id);

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    if (error.message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
