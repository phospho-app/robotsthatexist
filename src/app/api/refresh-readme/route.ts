import { NextRequest, NextResponse } from 'next/server'
import { refreshReadmeCache } from '@/lib/readme-cache'
import { supabase } from '@/lib/supabase'

// Manual README cache refresh endpoint (for debugging/admin use)
export async function POST(request: NextRequest) {
  try {
    const { robotId, slug } = await request.json()

    if (!robotId && !slug) {
      return NextResponse.json({ error: 'robotId or slug is required' }, { status: 400 })
    }

    // Get robot info
    let robot
    if (robotId) {
      const { data } = await supabase
        .from("robots")
        .select("id, slug, github_url")
        .eq("id", robotId)
        .single()
      robot = data
    } else {
      const { data } = await supabase
        .from("robots")
        .select("id, slug, github_url")
        .eq("slug", slug)
        .single()
      robot = data
    }

    if (!robot) {
      return NextResponse.json({ error: 'Robot not found' }, { status: 404 })
    }

    if (!robot.github_url) {
      return NextResponse.json({ error: 'Robot has no GitHub URL' }, { status: 400 })
    }

    // Force refresh cache
    const refreshedHtml = await refreshReadmeCache(robot.id, robot.github_url)

    return NextResponse.json({ 
      success: true,
      robotId: robot.id,
      slug: robot.slug,
      hasReadme: !!refreshedHtml,
      contentLength: refreshedHtml?.length || 0
    })
  } catch (error) {
    console.error('Error refreshing README cache:', error)
    return NextResponse.json({ 
      error: 'Failed to refresh README cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}