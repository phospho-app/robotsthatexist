'use client'

import { useEffect, useRef, useState } from 'react'

interface TwitterEmbedProps {
  tweetId: string
}

declare global {
  interface Window {
    twttr: any
  }
}

export function TwitterEmbed({ tweetId }: TwitterEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let mounted = true

    const loadTweet = async () => {
      if (!containerRef.current || !mounted) return

      setIsLoading(true)
      setHasError(false)

      try {
        // Check if Twitter widgets is already loaded
        if (window.twttr && window.twttr.widgets) {
          if (!mounted) return
          containerRef.current.innerHTML = ''
          await window.twttr.widgets.createTweet(tweetId, containerRef.current, {
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            width: 'auto',
            conversation: 'none',
            cards: 'visible'
          })
          if (mounted) setIsLoading(false)
        } else {
          // Load Twitter widgets script only if not already loading/loaded
          const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')
          
          if (!existingScript) {
            const script = document.createElement('script')
            script.src = 'https://platform.twitter.com/widgets.js'
            script.async = true
            script.charset = 'utf-8'
            
            script.onload = async () => {
              // Wait for twttr to be available
              let attempts = 0
              while (!window.twttr && attempts < 50 && mounted) {
                await new Promise(resolve => setTimeout(resolve, 100))
                attempts++
              }
              
              if (!mounted) return
              
              if (window.twttr && window.twttr.widgets && containerRef.current) {
                try {
                  containerRef.current.innerHTML = ''
                  await window.twttr.widgets.createTweet(tweetId, containerRef.current, {
                    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                    width: 'auto',
                    conversation: 'none',
                    cards: 'visible'
                  })
                  if (mounted) setIsLoading(false)
                } catch (error) {
                  console.error('Error creating tweet embed:', error)
                  if (mounted) {
                    setHasError(true)
                    setIsLoading(false)
                  }
                }
              } else {
                if (mounted) {
                  setHasError(true)
                  setIsLoading(false)
                }
              }
            }
            
            script.onerror = () => {
              if (mounted) {
                setHasError(true)
                setIsLoading(false)
              }
            }
            
            document.head.appendChild(script)
          } else {
            // Script already exists, wait for twttr to be available
            let attempts = 0
            while (!window.twttr && attempts < 50 && mounted) {
              await new Promise(resolve => setTimeout(resolve, 100))
              attempts++
            }
            
            if (!mounted) return
            
            if (window.twttr && window.twttr.widgets && containerRef.current) {
              try {
                containerRef.current.innerHTML = ''
                await window.twttr.widgets.createTweet(tweetId, containerRef.current, {
                  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                  width: 'auto',
                  conversation: 'none',
                  cards: 'visible'
                })
                if (mounted) setIsLoading(false)
              } catch (error) {
                console.error('Error creating tweet embed:', error)
                if (mounted) {
                  setHasError(true)
                  setIsLoading(false)
                }
              }
            } else {
              if (mounted) {
                setHasError(true)
                setIsLoading(false)
              }
            }
          }
        }

        // Timeout after 15 seconds
        timeoutId = setTimeout(() => {
          if (mounted) {
            setHasError(true)
            setIsLoading(false)
          }
        }, 15000)

      } catch (error) {
        console.error('Error loading tweet:', error)
        if (mounted) {
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    loadTweet()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [tweetId])

  if (hasError) {
    return (
      <div className="text-center text-muted-foreground py-4">
        <p>Unable to load tweet</p>
        <p className="text-xs mt-1">Tweet ID: {tweetId}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex justify-center items-center min-h-[200px] text-center text-muted-foreground">
          <div className="animate-pulse">Loading tweet...</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
      />
    </div>
  )
}