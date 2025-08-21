'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from '@/components/ui/link'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error during auth callback:', error)
          router.push('/auth/error')
          return
        }

        if (data.session) {
          router.push('/')
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Error during auth callback:', error)
        router.push('/auth/error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-gray-600 mb-4">Please wait while we redirect you.</p>
        <p className="text-sm text-gray-500">
          If you&apos;re not redirected, <Link href="/" className="text-blue-600 hover:underline">click here</Link>
        </p>
      </div>
    </div>
  )
}