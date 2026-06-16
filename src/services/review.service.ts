import prisma from "@/lib/prisma";

export class ReviewService {
  // user review creation
  static async createReview(
    productId: number,
    userId: number,
    rating: number,
    comment?: string,
  ) {
    if (!productId || !userId || !rating || rating < 1 || rating > 5) {
      throw new Error("Missing required review parameters.");
    }

    return await prisma.review.create({
      data: {
        product_id: productId,
        userId: userId,
        rating,
        comment,
        status: "approved",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  }

  // admin review moderation
  static async handleAdminAction(
    reviewId: number,
    action: "APPROVE" | "DECLINE",
  ) {
    if (!reviewId || !action) {
      throw new Error("VALIDATION_ERROR: Review ID and action are required.");
    }

    // Find the review first
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new Error("NOT_FOUND: Review not found.");
    }

    if (action === "APPROVE") {
      // Switch status to APPROVED so it shows up publicly
      return await prisma.review.update({
        where: { id: reviewId },
        data: { status: "approved" },
      });
    } else if (action === "DECLINE") {
      // Completely remove the review from the product if declined
      await prisma.review.delete({ where: { id: reviewId } });
      return { message: "Review successfully removed." };
    }
  }

  static async getReviewModerationList() {
    return await prisma.review.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },

        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }
}
