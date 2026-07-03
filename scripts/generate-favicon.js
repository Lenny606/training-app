import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Sleek Slate/Navy -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>
    
    <!-- Triangle Gradient: Sky blue to Neon Cyan -->
    <linearGradient id="triangleGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#00f0ff" />
    </linearGradient>

    <!-- Core Glow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Subtle Radial Glow behind the logo -->
    <radialGradient id="radialGlow" cx="50%" cy="55%" r="45%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#00f0ff" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  
  <!-- Subtle glowing border -->
  <rect x="6" y="6" width="500" height="500" rx="122" fill="none" stroke="#00f0ff" stroke-opacity="0.15" stroke-width="8" />

  <!-- Ambient Glow in center -->
  <circle cx="256" cy="266" r="180" fill="url(#radialGlow)" />

  <!-- Stylized modern "▲" shape with rounded vertices and a sleek gap/slice -->
  <g filter="url(#glow)">
    <!-- Main Triangle with smooth rounded corners -->
    <path d="M 233.5 137.9
             L 115.1 343.0
             C 100.3 368.6 118.8 400.0 148.4 400.0
             L 363.6 400.0
             C 393.2 400.0 411.7 368.6 396.9 343.0
             L 278.5 137.9
             C 268.2 120.1 243.8 120.1 233.5 137.9 Z" 
          fill="url(#triangleGrad)" />
          
    <!-- Sleek cutout to make it look like a premium tech brand (letter A / upward arrow) -->
    <path d="M 256 220
             L 180 350
             L 332 350 Z" 
          fill="#0f172a" />
  </g>
</svg>`

async function main() {
  const publicDir = path.resolve('public')

  // Write SVG file
  const svgPath = path.join(publicDir, 'favicon.svg')
  fs.writeFileSync(svgPath, SVG_CONTENT, 'utf8')
  console.log('✓ Created favicon.svg')

  // Generate PNGs
  const pngSizes = {
    'favicon-32.png': 32,
    'logo192.png': 192,
    'logo512.png': 512,
  }

  const buffers = {}

  for (const [filename, size] of Object.entries(pngSizes)) {
    const destPath = path.join(publicDir, filename)
    const buf = await sharp(Buffer.from(SVG_CONTENT))
      .resize(size, size)
      .png()
      .toBuffer()

    fs.writeFileSync(destPath, buf)
    buffers[size] = buf
    console.log(`✓ Created ${filename} (${size}x${size})`)
  }

  // Create valid ICO file containing the 32x32 PNG
  const png32 = buffers[32]

  // Header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type (1 for icon)
  header.writeUInt16LE(1, 4) // Number of images (1)

  // Directory Entry: 16 bytes
  const entry = Buffer.alloc(16)
  entry.writeUInt8(32, 0) // Width
  entry.writeUInt8(32, 1) // Height
  entry.writeUInt8(0, 2) // Palette count
  entry.writeUInt8(0, 3) // Reserved
  entry.writeUInt16LE(1, 4) // Color planes
  entry.writeUInt16LE(32, 6) // Bits per pixel
  entry.writeUInt32LE(png32.length, 8) // Size of image data
  entry.writeUInt32LE(22, 12) // Offset of image data (6 + 16 = 22)

  const icoBuffer = Buffer.concat([header, entry, png32])
  const icoPath = path.join(publicDir, 'favicon.ico')
  fs.writeFileSync(icoPath, icoBuffer)
  console.log('✓ Created favicon.ico containing 32x32 PNG')

  // Clean up temporary favicon-32.png
  const tempPng = path.join(publicDir, 'favicon-32.png')
  if (fs.existsSync(tempPng)) {
    fs.unlinkSync(tempPng)
  }
}

main().catch((err) => {
  console.error('Error generating favicons:', err)
  process.exit(1)
})
