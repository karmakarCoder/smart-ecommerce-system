import { NextResponse } from 'next/server'
import { ReviewService } from '@/services/review.service'

export async function GET() {
  try {
    const reviews = await ReviewService.getReviewModerationList()
    
    return NextResponse.json(
      { 
        count: reviews.length, 
        reviews 
      }, 
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch review moderation list.', details: error.message }, 
      { status: 500 }
    )
  }
}