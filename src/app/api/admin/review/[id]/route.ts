import { NextResponse } from 'next/server'
import { ReviewService } from '@/services/review.service'

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> } // params is treated as a Promise in modern Next.js
) {
  try {
    // 1. Unwrapped the params Promise first
    const resolvedParams = await params
    const reviewId = Number(resolvedParams.id)

    // 2. Validate that the ID is a true number
    if (isNaN(reviewId)) {
      return NextResponse.json({ error: "Invalid Review ID provided in URL path." }, { status: 400 })
    }

    // 3. Extract the action from the JSON body
    const { action } = await request.json() 

    // 4. Validate action input
    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json({ error: "Action must be either 'approved' or 'rejected'" }, { status: 400 })
    }

    // 5. Convert incoming strings to uppercase to match your service/Prisma Enum rules safely
    const normalizedAction = action === 'approved' ? 'APPROVE' : 'DECLINE'

    // 6. Execute the administration change state
    const result = await ReviewService.handleAdminAction(reviewId, normalizedAction)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}