// src/app/api/product/[id]/review/route.ts
import { NextResponse } from 'next/server'
import { ReviewService } from '@/services/review.service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate the User using the Bearer token header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    const authenticatedUserId = decoded.userId

    // 2. Resolve URL parameters and body payload data safely
    const resolvedParams = await params
    const productId = Number(resolvedParams.id)
    const { rating, comment } = await request.json()

    // 3. Create review mapped to this specific user ID
    const newReview = await ReviewService.createReview(
      productId, 
      authenticatedUserId, // Pass authenticated user ID here
      Number(rating), 
      comment
    )

    return NextResponse.json(
      { message: 'Review posted successfully.', review: newReview },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Unauthorized: Invalid authentication session.' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}