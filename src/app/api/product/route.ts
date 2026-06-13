import { NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";

export async function GET() {
  try {
    const data = await ProductService.getAllProducts();
    return NextResponse.json(
      { message: "Products retrieved successfully", data },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to retrieve products", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 415 },
      );
    }

    const formData = await request.formData();
    const newProduct = await ProductService.createProduct(formData);

    return NextResponse.json(
      { message: "Product created successfully", data: newProduct },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.message.includes("VALIDATION_ERROR")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A product with this unique SKU already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
