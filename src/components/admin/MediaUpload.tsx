import React, { useState } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, Film, Camera, Video } from 'lucide-react'
import type { Media } from '../../domain/plans'

interface MediaUploadProps {
  media?: Media[]
  onChange: (media: Media[]) => void
}

export function MediaUpload({ media = [], onChange }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploading) return

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
    <div className="space-y-3 mt-2">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
          uploading
            ? 'border-line/40 bg-chip/20'
            : 'border-line/60 bg-chip/40 hover:bg-lagoon/[0.02] hover:border-lagoon/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 text-lagoon animate-spin" />
              <span className="text-xs text-ink-soft font-medium animate-pulse">
                Uploading files...
              </span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-lagoon-deep hover:scale-110 transition-transform" />
              <div className="text-xs font-semibold text-ink">
                Drag & drop media or choose below
              </div>
              <div className="text-[10px] text-ink-soft">
                Supports Images & Videos up to 50MB
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-line/10 w-full justify-center">
                {/* Browse Files */}
                <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-[11px] font-semibold text-ink transition-all cursor-pointer active:scale-95">
                  <Upload className="h-3.5 w-3.5 text-lagoon-deep" />
                  <span>Browse Files</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    accept="image/*,video/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </div>

                {/* Take Photo */}
                <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-[11px] font-semibold text-ink transition-all cursor-pointer active:scale-95">
                  <Camera className="h-3.5 w-3.5 text-lagoon-deep" />
                  <span>Take Photo</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </div>

                {/* Record Video */}
                <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-chip hover:bg-lagoon/10 hover:border-lagoon/40 text-[11px] font-semibold text-ink transition-all cursor-pointer active:scale-95">
                  <Video className="h-3.5 w-3.5 text-lagoon-deep" />
                  <span>Record Video</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="video/*"
                    capture="environment"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-danger bg-danger/10 border border-danger/20 px-2.5 py-1.5 rounded-lg">
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
                className="group relative h-20 w-full rounded-lg overflow-hidden border border-line bg-foam/30 hover:scale-[1.02] hover:shadow-sm transition-all"
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
                    <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5 text-[8px] text-white flex items-center gap-0.5 font-semibold">
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
                    <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5 text-[8px] text-white flex items-center gap-0.5 font-semibold">
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
