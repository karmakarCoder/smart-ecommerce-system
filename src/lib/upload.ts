import fs from 'fs/promises'
import path from 'path'

export async function saveFileToDisk(file: File | null, baseUrl?: string): Promise<string | null> {
  if (!file || file.size === 0) return null

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const fileExtension = path.extname(file.name)
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, uniqueFilename), buffer)
  
  const fallbackBase = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${fallbackBase}/uploads/${uniqueFilename}`
}