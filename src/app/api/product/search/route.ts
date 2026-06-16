// src/app/api/products/search/route.ts
import { NextResponse } from 'next/server'
import { ProductService } from '@/services/product.service'

export async function GET(request: Request) {
  try {
    // 1. Extract URL search params
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('query') || undefined
    const category = searchParams.get('category') || undefined
    const sort_by = searchParams.get('sort_by') || undefined

    const min_price = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined
    const max_price = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10

    // 2. Execute structured search query inside the service layer
    const searchResults = await ProductService.searchProducts({
      query,
      category,
      min_price,
      max_price,
      sort_by,
      page,
      limit,
    })

    return NextResponse.json(searchResults, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'An error occurred during search execution.', details: error.message },
      { status: 500 }
    )
  }
}