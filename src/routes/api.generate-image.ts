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
          const description =
            typeof body.description === 'string' ? body.description.trim() : ''

          const apiKey = process.env.OPENAI_API_KEY
          if (!apiKey) {
            console.error('[generate-image] OPENAI_API_KEY is not configured.')
            return new Response(
              'AI generation is not configured on the server.',
              { status: 500 },
            )
          }

          const prompt = `A professional, high-quality fitness illustration or photograph demonstrating the exercise: "${name}".${description ? ` Description/Form details: ${description}.` : ''} Clean minimalist gym background, studio lighting, clear form demonstration, no text, aesthetic, centered view.`

          // GPT image models always return base64 (no URL variant)
          const requestGeneration = (model: string) =>
            fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                prompt,
                n: 1,
                size: '1024x1024',
                quality: 'low',
                output_format: 'png',
              }),
            })

          let openAiResponse = await requestGeneration('gpt-image-1-mini')

          if (!openAiResponse.ok) {
            const errorText = await openAiResponse.clone().text()
            console.warn(
              '[generate-image] gpt-image-1-mini call failed, trying gpt-image-1 fallback. Error:',
              errorText,
            )
            openAiResponse = await requestGeneration('gpt-image-1')
          }

          if (!openAiResponse.ok) {
            const errorText = await openAiResponse.text()
            console.error(
              '[generate-image] OpenAI API error (both gpt-image-1-mini and gpt-image-1 failed):',
              errorText,
            )
            return new Response(`OpenAI generation failed: ${errorText}`, {
              status: 502,
            })
          }

          const responseData = await openAiResponse.json()
          const b64Image = responseData.data?.[0]?.b64_json
          if (!b64Image) {
            console.error(
              '[generate-image] OpenAI response missing image data:',
              responseData,
            )
            return new Response('Invalid response from AI generator.', {
              status: 502,
            })
          }

          const buffer = Buffer.from(b64Image, 'base64')

          const fs = await import('node:fs')
          const path = await import('node:path')
          const { getUploadDir } = await import('../utils/upload')
          const { createId } = await import('../utils/id')
          const { getDb } = await import('../db/client')
          const { media } = await import('../db/schema')

          const uploadDir = getUploadDir()
          await fs.promises.mkdir(uploadDir, { recursive: true })

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
          await fs.promises.writeFile(filePath, finalBuffer)

          const originalName = `${name.substring(0, 50)} (AI Generated).${finalMimeType === 'image/png' ? 'png' : 'webp'}`

          const db = getDb()
          const mediaId = createId('media')
          await db
            .insert(media)
            .values({
              id: mediaId,
              userId: user.id,
              activityId: null, // linked during plan save
              fileName: finalFileName,
              originalName,
              mimeType: finalMimeType,
              fileSize: finalFileSize,
              createdAt: new Date(),
            })
            .run()

          return new Response(
            JSON.stringify({
              id: mediaId,
              fileName: finalFileName,
              originalName,
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
