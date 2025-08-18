'use client'

import { useEffect, useRef, ReactNode, useState } from 'react'

interface MasonryGridProps {
  children: ReactNode[]
  gap?: string
}

export function MasonryGrid({ 
  children, 
  gap = '1.5rem' 
}: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(3)

  useEffect(() => {
    const updateLayout = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.offsetWidth
      const gapPx = parseFloat(gap) * 16 // Convert rem to px (assuming 1rem = 16px)
      
      // Determine column count based on screen width
      let cols = 1
      if (containerWidth >= 1024) cols = 3
      else if (containerWidth >= 640) cols = 2
      
      setColumnCount(cols)

      const items = Array.from(container.children) as HTMLElement[]
      if (items.length === 0) return

      // Initialize column heights
      const columnHeights = new Array(cols).fill(0)
      
      // Position each item
      items.forEach((item) => {
        // Find the shortest column
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
        
        // Position the item
        item.style.position = 'absolute'
        item.style.left = `${(shortestColumnIndex * (100 / cols)) + (shortestColumnIndex * gapPx / containerWidth * 100)}%`
        item.style.top = `${columnHeights[shortestColumnIndex]}px`
        item.style.width = `calc(${100 / cols}% - ${((cols - 1) * gapPx) / cols}px)`
        
        // Update column height
        const itemHeight = item.getBoundingClientRect().height
        columnHeights[shortestColumnIndex] += itemHeight + gapPx
      })

      // Set container height to the tallest column
      const maxHeight = Math.max(...columnHeights) - gapPx // Subtract last gap
      container.style.height = `${maxHeight}px`
    }

    // Initial layout
    const timer = setTimeout(updateLayout, 100)

    // Update on window resize
    window.addEventListener('resize', updateLayout)

    // Observer for content changes (like images loading)
    const observer = new ResizeObserver(() => {
      setTimeout(updateLayout, 50)
    })

    if (containerRef.current) {
      const items = containerRef.current.children
      Array.from(items).forEach(item => observer.observe(item))
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateLayout)
      observer.disconnect()
    }
  }, [children, gap])

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ minHeight: '200px' }}
    >
      {children}
    </div>
  )
}