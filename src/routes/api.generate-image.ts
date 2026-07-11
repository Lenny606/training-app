import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/generate-image')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { getSessionUser } = await import('../auth/session')
          const user = await getSessionUser()
          if (!user) {
            return new Response('Authentication required.', { status: 401 })
          }

          const body = await request.json().catch(() => null)
          if (!body || typeof body.name !== 'string' || !body.name.trim()) {
            return new Response('Activity name is required.', { status: 400 })
          }

          const name = body.name.trim()
          const description = typeof body.description === 'string' ? body.description.trim() : ''

          const apiKey = process.env.OPENAI_API_KEY
          if (!apiKey) {
            console.error('[generate-image] OPENAI_API_KEY is not configured.')
            return new Response('AI generation is not configured on the server.', { status: 500 })
          }

          // Construct DALL-E prompt
          const prompt = `A professional, high-quality fitness illustration or photograph demonstrating the exercise: "${name}".${description ? ` Description/Form details: ${description}.` : ''} Clean minimalist gym background, studio lighting, clear form demonstration, no text, aesthetic, centered view.`

          // Call OpenAI API
          let openAiResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'dall-e-2',
              prompt: prompt,
              n: 1,
              size: '512x512',
            }),
          })

          // Fallback to DALL-E 3 if DALL-E 2 is not supported or fails
          if (!openAiResponse.ok) {
            const errorText = await openAiResponse.clone().text()
            console.warn('[generate-image] DALL-E 2 call failed, trying DALL-E 3 fallback. Error:', errorText)

            openAiResponse = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: '1024x1024',
              }),
            })
          }

          if (!openAiResponse.ok) {
            const errorText = await openAiResponse.text()
            console.error('[generate-image] OpenAI API error (both DALL-E 2 and 3 failed):', errorText)
            return new Response(`OpenAI generation failed: ${errorText}`, { status: 502 })
          }

          const responseData = await openAiResponse.json()
          const imageUrl = responseData.data?.[0]?.url
          if (!imageUrl) {
            console.error('[generate-image] OpenAI response missing image URL:', responseData)
            return new Response('Invalid response from AI generator.', { status: 502 })
          }

          // Download image
          const imageResponse = await fetch(imageUrl)
          if (!imageResponse.ok) {
            console.error(`[generate-image] Failed to download image from ${imageUrl}`)
            return new Response('Failed to download generated image from AI service.', { status: 502 })
          }

          const arrayBuffer = await imageResponse.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const fs = await import('node:fs')
          const path = await import('node:path')
          const { getUploadDir } = await import('../utils/upload')
          const { createId } = await import('../utils/id')
          const { getDb } = await import('../db/client')
          const { media } = await import('../db/schema')

          const uploadDir = getUploadDir()
          fs.mkdirSync(uploadDir, { recursive: true })

          let finalBuffer: Buffer = buffer
          let finalFileName = ''
          let finalMimeType = 'image/webp'
          let finalFileSize = buffer.length

          try {
            const sharp = (await import('sharp')).default
            finalBuffer = await sharp(buffer)
              .resize({
                width: 800,
                height: 800,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .webp({ quality: 60 })
              .toBuffer()

            finalFileName = `${createId('file')}.webp`
            finalFileSize = finalBuffer.length
          } catch (sharpError) {
            console.warn(
              '[generate-image] Sharp processing failed, falling back to original PNG:',
              sharpError,
            )
            finalFileName = `${createId('file')}.png`
            finalMimeType = 'image/png'
          }

          const filePath = path.join(uploadDir, finalFileName)
          fs.writeFileSync(filePath, finalBuffer)

          const db = getDb()
          const mediaId = createId('media')
          await db
            .insert(media)
            .values({
              id: mediaId,
              userId: user.id,
              activityId: null, // linked during plan save
              fileName: finalFileName,
              originalName: `${name.substring(0, 50)} (AI Generated).webp`,
              mimeType: finalMimeType,
              fileSize: finalFileSize,
              createdAt: new Date(),
            })
            .run()

          return new Response(
            JSON.stringify({
              id: mediaId,
              fileName: finalFileName,
              originalName: `${name} (AI Generated).webp`,
              mimeType: finalMimeType,
              fileSize: finalFileSize,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
        } catch (error) {
          console.error('[generate-image] Failed to generate image:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      },
    },
  },
})
