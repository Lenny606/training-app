import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { getSessionUser } = await import('../auth/session')
          const user = await getSessionUser()
          if (!user) {
            return new Response('Authentication required.', { status: 401 })
          }

          const formData = await request.formData().catch(() => null)
          if (!formData) {
            return new Response('Invalid form data.', { status: 400 })
          }

          const file = formData.get('file')
          if (!file || typeof file === 'string') {
            return new Response('No file provided or invalid file format.', {
              status: 400,
            })
          }

          const fs = await import('node:fs')
          const path = await import('node:path')
          const { getUploadDir } = await import('../utils/upload')
          const { createId } = await import('../utils/id')
          const { getDb } = await import('../db/client')
          const { media } = await import('../db/schema')

          const uploadDir = getUploadDir()
          fs.mkdirSync(uploadDir, { recursive: true })

          const mediaId = createId('media')
          const extension = path.extname(file.name)

          // Read stream/arrayBuffer and save to disk
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          let finalBuffer: Buffer<ArrayBufferLike> = buffer
          let finalFileName = ''
          let finalMimeType = file.type
          let finalFileSize = file.size

          const isImage = file.type.startsWith('image/')
          const isSvg = file.type === 'image/svg+xml'
          const isGif = file.type === 'image/gif'

          if (isImage && !isSvg && !isGif) {
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
              finalMimeType = 'image/webp'
              finalFileSize = finalBuffer.length
            } catch (sharpError) {
              console.warn(
                '[upload] Sharp processing failed, falling back to original file:',
                sharpError,
              )
              finalFileName = `${createId('file')}${extension}`
            }
          } else {
            finalFileName = `${createId('file')}${extension}`
          }

          const filePath = path.join(uploadDir, finalFileName)
          fs.writeFileSync(filePath, finalBuffer)

          const db = getDb()
          await db
            .insert(media)
            .values({
              id: mediaId,
              userId: user.id,
              activityId: null, // linked during plan save
              fileName: finalFileName,
              originalName: file.name,
              mimeType: finalMimeType,
              fileSize: finalFileSize,
              createdAt: new Date(),
            })
            .run()

          return new Response(
            JSON.stringify({
              id: mediaId,
              fileName: finalFileName,
              originalName: file.name,
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
          console.error('[upload] Failed to upload file:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      },
    },
  },
})
