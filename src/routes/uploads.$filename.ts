import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/uploads/$filename')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { getSessionUser } = await import('../auth/session')
          const user = await getSessionUser()
          if (!user) {
            return new Response('Authentication required.', { status: 401 })
          }

          const filename = params.filename
          // Validate filename to prevent Directory Traversal
          if (!/^[a-zA-Z0-9_.-]+$/.test(filename) || filename.includes('..')) {
            return new Response('Invalid filename.', { status: 400 })
          }

          const fs = await import('node:fs')
          const path = await import('node:path')
          const { getUploadDir } = await import('../utils/upload')

          const uploadDir = getUploadDir()
          const filePath = path.join(uploadDir, filename)

          if (!fs.existsSync(filePath)) {
            return new Response('File not found.', { status: 404 })
          }

          const fileBuffer = fs.readFileSync(filePath)
          const ext = path.extname(filename).toLowerCase()

          // Simple MIME type resolver
          let contentType = 'application/octet-stream'
          if (ext === '.png') contentType = 'image/png'
          else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
          else if (ext === '.gif') contentType = 'image/gif'
          else if (ext === '.webp') contentType = 'image/webp'
          else if (ext === '.svg') contentType = 'image/svg+xml'
          else if (ext === '.mp4') contentType = 'video/mp4'
          else if (ext === '.webm') contentType = 'video/webm'
          else if (ext === '.ogg') contentType = 'video/ogg'
          else if (ext === '.mov') contentType = 'video/quicktime'

          return new Response(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch (error) {
          console.error('[uploads] Failed to serve file:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      },
    },
  },
})
