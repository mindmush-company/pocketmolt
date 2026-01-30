'use client'

import { useEffect, useRef } from 'react'

interface AsciiQrCanvasProps {
  asciiQr: string
  pixelSize?: number
  className?: string
}

/**
 * Renders ASCII QR codes (using Unicode block characters) to a canvas.
 * 
 * Each character represents 2 vertical pixels:
 * - █ (FULL BLOCK) = top: black, bottom: black
 * - ▀ (UPPER HALF) = top: black, bottom: white
 * - ▄ (LOWER HALF) = top: white, bottom: black
 * - ' ' (space) = top: white, bottom: white
 */
export function AsciiQrCanvas({ asciiQr, pixelSize = 4, className }: AsciiQrCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !asciiQr) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lines = asciiQr.split('\n').filter(line => line.length > 0)
    if (lines.length === 0) return

    const width = Math.max(...lines.map(line => line.length))
    const height = lines.length * 2

    canvas.width = width * pixelSize
    canvas.height = height * pixelSize

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#000000'

    lines.forEach((line, lineIndex) => {
      const y = lineIndex * 2

      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex]
        const x = charIndex

        let topBlack = false
        let bottomBlack = false

        switch (char) {
          case '█':
            topBlack = true
            bottomBlack = true
            break
          case '▀':
            topBlack = true
            break
          case '▄':
            bottomBlack = true
            break
        }

        if (topBlack) {
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
        }
        if (bottomBlack) {
          ctx.fillRect(x * pixelSize, (y + 1) * pixelSize, pixelSize, pixelSize)
        }
      }
    })
  }, [asciiQr, pixelSize])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
