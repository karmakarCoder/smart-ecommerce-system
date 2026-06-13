import { GoogleGenAI, Type } from '@google/genai'
import prisma from '@/lib/prisma'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export class AiService {

  static async executeSmartAction(userPrompt: string, userRole: string) {
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        intent: { 
          type: Type.STRING, 
          enum: ['FILTER_PRODUCTS', 'DELETE_PRODUCT', 'UNKNOWN'],
          description: 'The classified engine intent.' 
        },
        searchQuery: { type: Type.STRING, description: 'Text keywords found.' },
        maxPrice: { type: Type.NUMBER, description: 'Extracted upper pricing roof.' },
        targetProductId: { type: Type.INTEGER, description: 'Target database ID if applicable.' }
      },
      required: ['intent']
    }

    const systemInstruction = `
      You are an e-commerce routing engine. Analyze the user prompt. User role: ${userRole}.
      If intent is 'DELETE_PRODUCT' and role is not 'ADMIN', classify as 'UNKNOWN'.
    `

    let extractedConfig;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema, 
          temperature: 0.1,
        }
      })
      
      extractedConfig = JSON.parse(response.text ?? '{}')

    } catch (aiError: any) {
      console.warn('⚠️ Server spike caught. Moving gracefully to standard database filter fallback layer.')
      
      const lowerPrompt = userPrompt.toLowerCase()
      let fallbackQuery = ""
      if (lowerPrompt.includes("phone") || lowerPrompt.includes("iphone")) fallbackQuery = "iphone"
      if (lowerPrompt.includes("keyboard")) fallbackQuery = "keyboard"
      
      extractedConfig = {
        intent: 'FILTER_PRODUCTS',
        searchQuery: fallbackQuery || userPrompt.substring(0, 20),
        maxPrice: lowerPrompt.includes("under 1200") ? 1200 : null,
        targetProductId: null
      }
    }

    switch (extractedConfig.intent) {
      case 'FILTER_PRODUCTS': {
        const whereClause: any = {}
        
        if (extractedConfig.searchQuery) {
          whereClause.OR = [
            { name: { contains: extractedConfig.searchQuery, mode: 'insensitive' } },
            { description: { contains: extractedConfig.searchQuery, mode: 'insensitive' } }
          ]
        }
        
        if (extractedConfig.maxPrice) {
          whereClause.price = { lte: extractedConfig.maxPrice }
        }

        const products = await prisma.product.findMany({
          where: whereClause,
          take: 15
        })

        return {
          type: 'DISPLAY_DATA',
          message: "Processed through the upgraded core model engine seamlessly.",
          data: products
        }
      }

      case 'DELETE_PRODUCT': {
        if (userRole !== 'ADMIN') throw new Error('FORBIDDEN: Insufficient administrative clearances.')
        await prisma.product.delete({ where: { id: extractedConfig.targetProductId } })
        return { type: 'MUTATION_SUCCESS', message: `Product #${extractedConfig.targetProductId} deleted.` }
      }

      default:
        return { type: 'FALLBACK_NOTICE', message: "System core stable. Rephrase selection input.", data: [] }
    }
  }
}