import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

interface SearchQueryParams {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  page?: number;
  limit?: number;
}

export class ProductService {
  private static async handleImageUpload(
    file: File | null,
    baseUrl?: string,
  ): Promise<string | null> {
    if (!file || file.size === 0) return null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, uniqueFilename), buffer);

    const relativePath = `/uploads/${uniqueFilename}`;
    return baseUrl ? `${baseUrl}${relativePath}` : relativePath;
  }

  // generate product code
  private static generateSKU(productName: string): string {
    const sanitizedName = productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    const prefix =
      sanitizedName.length >= 2 ? sanitizedName.substring(0, 2) : "PRD";
    const now = new Date();
    const dateStamp = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const randomTail = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `${prefix}-${dateStamp}-${randomTail}`;
  }

  // search products
  static async searchProducts(params: SearchQueryParams) {
    const {
      query,
      category,
      min_price,
      max_price,
      sort_by = "createdAt",
      page = 1,
      limit = 10,
    } = params;

    // 1. Calculate pagination offset
    const skip = (page - 1) * limit;

    // 2. Dynamically build the Prisma WHERE clause conditional filters
    const whereClause: Prisma.ProductWhereInput = {};

    // Match text queries against both Name and Description
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // Filter by strict category matching
    if (category) {
      whereClause.category = { equals: category, mode: "insensitive" };
    }

    // Filter by min/max price thresholds
    if (min_price !== undefined || max_price !== undefined) {
      whereClause.price = {};
      if (min_price !== undefined) whereClause.price.gte = min_price;
      if (max_price !== undefined) whereClause.price.lte = max_price;
    }

    // 3. Dynamically resolve Sorting criteria
    let orderByClause: Prisma.ProductOrderByWithRelationInput = {
      createdAt: "desc",
    };
    if (sort_by === "price_asc") orderByClause = { price: "asc" };
    if (sort_by === "price_desc") orderByClause = { price: "desc" };
    if (sort_by === "rating")
      orderByClause = {
        reviews: {
          _count: "desc",
        },
      };

    const [rawProducts, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where: whereClause }),
    ]);


    const products = rawProducts.map((product) => {
      const reviewsCount = product.reviews.length;
      const avgRating =
        reviewsCount > 0
          ? Math.round(
              product.reviews.reduce((sum, r) => sum + r.rating, 0) /
                reviewsCount,
            )
          : 0;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
        status: product.status,
        stock: product.stock,
        category: product.category,
        imageUrl: product.imageUrl,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        rating: avgRating,
        reviews: product.reviews, 
        total_reviews: reviewsCount, 
      };
    });

    // Calculate total pagination pages remaining
    const totalPages = Math.ceil(totalCount / limit);

    return {
      metadata: {
        totalResults: totalCount,
        currentPage: page,
        totalPages,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      products,
    };
  }

  // all product
  static async getAllProducts() {
    const products = await prisma.product.findMany({
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map((product: any) => {
      const totalReviews = product.reviews.length;
      const totalRatingSum = product.reviews.reduce(
        (acc: any, rev: any) => acc + rev.rating,
        0,
      );
      const averageRating =
        totalReviews > 0
          ? parseFloat(
              (totalReviews > 0 ? totalRatingSum / totalReviews : 0).toFixed(1),
            )
          : 0;

      return {
        ...product,
        total_reviews: totalReviews,
        rating: averageRating,
      };
    });
  }

  // product details
  static async getProductById(id: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new Error("VALIDATION_ERROR: Invalid product ID format.");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        reviews: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!product) {
      throw new Error("NOT_FOUND: Product not found.");
    }

    const totalReviews = product.reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              product.reviews.reduce((sum, rev) => sum + rev.rating, 0) /
              totalReviews
            ).toFixed(1),
          )
        : 0;

    return {
      ...product,
      total_reviews: totalReviews,
      average_rating: averageRating,
      status: product.status,
      stock: product.stock,
    };
  }

  // create product
  static async createProduct(formData: FormData, baseUrl?: string) {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const priceRaw = formData.get("price") as string;
    const imageFile = formData.get("image") as File | null;
    const status = formData.get("status") as string | null;
    const stock = formData.get("stock") as string | null;
    const category = formData.get("category") as string | null;

    const price = parseFloat(priceRaw);
    const generatedSku = this.generateSKU(name);

    if (!name || isNaN(price)) {
      throw new Error(
        "VALIDATION_ERROR: Product name and a valid price are required.",
      );
    }

    const fallbackBase =
      baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const finalImageUrl = await this.handleImageUpload(imageFile, fallbackBase);

    return await prisma.product.create({
      data: {
        name,
        sku: generatedSku,
        description,
        price,
        imageUrl: finalImageUrl || null,
        status: status || "available",
        stock: stock ? parseInt(stock, 10) : 0,
        category: category || null,
      },
    });
  }

  // update product
  static async updateProduct(id: string, formData: FormData, baseUrl?: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new Error("VALIDATION_ERROR: Invalid product ID format.");
    }
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new Error("NOT_FOUND: Product not found.");
    }

    const nameInput = formData.get("name") as string | null;
    const descriptionInput = formData.get("description") as string | null;
    const priceInput = formData.get("price") as string | null;
    const imageFile = formData.get("image") as File | null;
    const statusInput = formData.get("status") as string | null;
    const stockInput = formData.get("stock") as string | null;
    const categoryInput = formData.get("category") as string | null;

    const name =
      nameInput && nameInput.trim() !== ""
        ? nameInput.trim()
        : existingProduct.name;
    const sku = existingProduct.sku;

    const description =
      descriptionInput !== null && descriptionInput.trim() !== ""
        ? descriptionInput.trim()
        : existingProduct.description;

    let price = existingProduct.price;
    if (priceInput && priceInput.trim() !== "") {
      const parsedPrice = parseFloat(priceInput);
      if (isNaN(parsedPrice)) {
        throw new Error(
          "VALIDATION_ERROR: Provided price is not a valid number.",
        );
      }
      price = parsedPrice;
    }

    const status =
      statusInput !== null && statusInput.trim() !== ""
        ? statusInput.trim()
        : existingProduct.status;

    const stock =
      stockInput !== null && stockInput.trim() !== ""
        ? parseInt(stockInput, 10)
        : existingProduct.stock;

    const category =
      categoryInput !== null && categoryInput.trim() !== ""
        ? categoryInput.trim()
        : existingProduct.category;

    let finalImageUrl = existingProduct.imageUrl;
    let shouldDeleteOldImage = false;

    if (imageFile && imageFile.size > 0) {
      const fallbackBase =
        baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const uploadedUrl = await this.handleImageUpload(imageFile, fallbackBase);

      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
        shouldDeleteOldImage = !!existingProduct.imageUrl;
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        sku,
        description,
        price,
        imageUrl: finalImageUrl,
        status,
        stock,
        category: category || null,
      },
    });

    // delete the old physical file from /public/uploads if desired

    if (shouldDeleteOldImage && existingProduct.imageUrl) {
      try {
        const urlPath = new URL(existingProduct.imageUrl).pathname;
        const physicalPath = path.join(process.cwd(), "public", urlPath);
        await fs.access(physicalPath);
        await fs.unlink(physicalPath);
      } catch (e) {
        console.error(
          "Warning: Failed to delete orphaned image asset from disk:",
          e,
        );
      }
    }

    return updatedProduct;
  }

  // delete product

  static async deleteProduct(id: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new Error("VALIDATION_ERROR: Invalid product ID format.");
    }
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new Error("NOT_FOUND: Product not found.");
    }

    if (existingProduct.imageUrl) {
      try {
        const urlPath = new URL(existingProduct.imageUrl).pathname;
        const physicalPath = path.join(process.cwd(), "public", urlPath);
        await fs.unlink(physicalPath);
      } catch (e) {
        console.error("Could not delete physical image file:", e);
      }
    }

    return await prisma.product.delete({
      where: { id: productId },
    });
  }
}
