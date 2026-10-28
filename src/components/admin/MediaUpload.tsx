import React, { useState } from 'react'
import {
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Film,
  Camera,
  Video,
  Sparkles,
} from 'lucide-react'
import type { Media } from '../../domain/plans'

interface MediaUploadProps {
  media?: Media[]
  onChange: (media: Media[]) => void
  activityName?: string
  activityDescription?: string
}

export function MediaUpload({
  media = [],
  onChange,
  activityName,
  activityDescription,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUploadFiles = async (files: FileList) => {
    setUploading(true)
    setError(null)

    const newMediaItems: Media[] = [...media]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue

      // Support basic validation (images and videos)
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) {
        setError(
          `File "${file.name}" is not supported. Please upload an image or a video.`,
        )
        continue
      }

      // Max size limit check (e.g. 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Max size is 50MB.`)
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || 'Upload failed.')
        }

        const uploadedMedia: Media = await response.json()
        newMediaItems.push(uploadedMedia)
      } catch (err) {
        console.error('Upload error:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to upload one or more files.',
        )
      }
    }

    onChange(newMediaItems)
    setUploading(false)
  }

  const handleGenerateAiImage = async () => {
    if (!activityName || !activityName.trim()) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: activityName,
          description: activityDescription,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'AI generation failed.')
      }

      const uploadedMedia: Media = await response.json()
      onChange([...media, uploadedMedia])
    } catch (err) {
      console.error('AI generation error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate image with AI.',
      )
    } finally {
      setGenerating(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploading || generating) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleRemoveMedia = (idToRemove: string) => {
    const updated = media.filter((m) => m.id !== idToRemove)
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex flex-wrap items-center gap-2"
      >
        {uploading || generating ? (
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Loader2 className="h-4 w-4 text-lagoon animate-spin" />
            {generating ? 'Generating…' : 'Uploading…'}
          </span>
        ) : (
          <>
            <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-xxs font-semibold text-ink transition-all cursor-pointer">
              <Upload className="h-3.5 w-3.5 text-lagoon-deep" />
              <span>Upload</span>
              <input
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload images or videos"
              />
            </div>
            <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-xxs font-semibold text-ink transition-all cursor-pointer sm:hidden">
              <Camera className="h-3.5 w-3.5 text-lagoon-deep" />
              <span>Photo</span>
              <input
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Take Photo"
              />
            </div>
            <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-xxs font-semibold text-ink transition-all cursor-pointer sm:hidden">
              <Video className="h-3.5 w-3.5 text-lagoon-deep" />
              <span>Video</span>
              <input
                type="file"
                onChange={handleFileChange}
                accept="video/*"
                capture="environment"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Record Video"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateAiImage}
              disabled={!activityName?.trim()}
              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-xxs font-semibold text-ink transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Generate image with AI"
            >
              <Sparkles className="h-3.5 w-3.5 text-lagoon-deep" />
              <span>AI</span>
            </button>
            <span className="text-2xs text-ink-soft">
              or drop files · max 50 MB
            </span>
          </>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-xxs text-danger bg-danger/10 border border-danger/20 px-2.5 py-1.5 rounded-lg"
        >
          {error}
        </div>
      )}

      {/* Previews Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {media.map((item) => {
            const isVideo = item.mimeType?.startsWith('video/')
            const mediaUrl = `/uploads/${item.fileName}`

            return (
              <div
                key={item.id}
                className="group relative h-20 w-full rounded-lg overflow-hidden border border-line bg-foam/30 hover:scale-102 hover:shadow-sm transition-all"
              >
                {isVideo ? (
                  <div className="relative w-full h-full">
                    <video
                      src={mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5 text-4xs text-white flex items-center gap-0.5 font-semibold">
                      <Film className="h-2 w-2" />
                      <span>VIDEO</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={mediaUrl}
                      alt={item.originalName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5 text-4xs text-white flex items-center gap-0.5 font-semibold">
                      <ImageIcon className="h-2 w-2" />
                      <span>IMAGE</span>
                    </div>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(item.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-danger hover:scale-110 transition-all duration-150 cursor-pointer"
                  title="Remove media"
                  aria-label="Remove media"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
