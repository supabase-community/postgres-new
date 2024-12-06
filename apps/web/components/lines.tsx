'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface LineAnimationProps {
  columns?: number
}

const LineAnimation: React.FC<LineAnimationProps> = ({ columns = 100 }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const columnWidth = dimensions.width / columns

  const lines = useMemo(() => {
    return Array.from({ length: columns }, (_, i) => {
      const x = `${(i / columns) * 100}%`
      return { x, key: i }
    })
  }, [columns])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden absolute inset-0 text-muted-foreground"
    >
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {lines.map(({ x, key }) => (
          <React.Fragment key={key}>
            <line
              x1={x}
              y1="0%"
              x2={x}
              y2="100%"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
            <AnimatedLine x={x} />
          </React.Fragment>
        ))}
      </svg>
    </div>
  )
}

interface AnimatedLineProps {
  x: string
}

const AnimatedLine: React.FC<AnimatedLineProps> = ({ x }) => {
  const duration = 3 + Math.random() * 2 // Random duration between 3-5 seconds
  const delay = Math.random() * 5 // Random delay up to 5 seconds

  return (
    <motion.rect
      x={x}
      width="1"
      y="0%"
      height="10%"
      fill="url(#lineGradient)"
      initial={{ y: '100%' }}
      animate={{ y: '-10%' }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'linear',
      }}
    />
  )
}

export default LineAnimation
