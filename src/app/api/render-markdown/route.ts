import { NextRequest, NextResponse } from 'next/server'

// Utility function to rewrite relative URLs in GitHub HTML
function rewriteRelativeUrls(html: string, repoUrl: string): string {
  if (!repoUrl) return html;
  
  // Extract owner, repo, and branch from GitHub URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return html;
  
  const [, owner, repo] = match;
  const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/`;
  const blobUrl = `https://github.com/${owner}/${repo}/blob/main/`;
  
  return html
    // Fix relative image sources
    .replace(/src="(?!https?:\/\/)([^"]+)"/g, (_, path) => {
      if (path.startsWith('/')) {
        return `src="https://github.com${path}"`;
      }
      return `src="${baseUrl}${path}"`;
    })
    // Fix relative links
    .replace(/href="(?!https?:\/\/)([^"]+)"/g, (_, path) => {
      if (path.startsWith('/')) {
        return `href="https://github.com${path}"`;
      }
      if (path.endsWith('.md') || path.includes('#')) {
        return `href="${blobUrl}${path}"`;
      }
      return `href="${baseUrl}${path}"`;
    });
}

export async function POST(request: NextRequest) {
  try {
    const { markdown, repoUrl } = await request.json()

    if (!markdown) {
      return NextResponse.json({ error: 'Markdown content is required' }, { status: 400 })
    }

    // Prepare headers - only add authorization if token exists
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
    }

    const renderRes = await fetch('https://api.github.com/markdown', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: markdown,
        mode: 'gfm' // GitHub Flavored Markdown
      })
    })

    if (!renderRes.ok) {
      const errorText = await renderRes.text()
      console.error('GitHub API error:', errorText)
      
      // If it's a rate limit error and we don't have a token, provide helpful message
      if (renderRes.status === 403 && !process.env.GITHUB_TOKEN) {
        return NextResponse.json({ 
          error: 'GitHub API rate limit reached. Please set GITHUB_TOKEN environment variable for higher limits.',
          fallback: true 
        }, { status: 429 })
      }
      
      return NextResponse.json({ error: errorText }, { status: renderRes.status })
    }

    let html = await renderRes.text()
    
    // Rewrite relative URLs if we have a repository URL
    if (repoUrl) {
      html = rewriteRelativeUrls(html, repoUrl)
    }
    
    return NextResponse.json({ html })
  } catch (error) {
    console.error('Error rendering markdown:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}