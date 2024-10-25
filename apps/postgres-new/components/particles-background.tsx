'use client'

import React, { useRef, useEffect, ReactNode, useState } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
}

interface ParticlesBackgroundProps {
  children?: ReactNode
}

export function ParticlesBackground({ children }: ParticlesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []

    const COLOR = '#FFFFFF'
    const MIN_SIZE = 3
    const MAX_SIZE = 8

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = () => {
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000)
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
          speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.8 + 0.2,
        })
      }
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        ctx.fillStyle = `${COLOR}${Math.floor(particle.opacity * 255)
          .toString(16)
          .padStart(2, '0')}`
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size)

        if (!prefersReducedMotion) {
          particle.y -= particle.speed
          if (particle.y + particle.size < 0) {
            particle.y = canvas.height
            particle.x = Math.random() * canvas.width
            particle.opacity = Math.random() * 0.8 + 0.2
          }
        }
      })
    }

    const animate = () => {
      drawParticles()
      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }

    resizeCanvas()
    createParticles()
    animate()

    window.addEventListener('resize', () => {
      resizeCanvas()
      createParticles()
      drawParticles()
    })

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [prefersReducedMotion])

  return (
    <div className="relative w-full h-full min-h-screen">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full"
        style={{ backgroundColor: 'black' }}
        aria-label="Particle background animation"
      />
      {children}
    </div>
  )
}
