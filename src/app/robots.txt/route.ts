import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://robotsthatexist.com';
  
  const robotsTxt = `# Robots.txt for Robots That Exist
# Welcome robots! 🤖

User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Allow crawling of robot pages
Allow: /robots/
Allow: /robots/*

# Allow crawling of main pages
Allow: /

# Disallow admin areas
Disallow: /admin/
Disallow: /admin/*

# Disallow auth pages (no SEO value)
Disallow: /auth/
Disallow: /auth/*

# Allow API documentation but not the API endpoints themselves
Disallow: /api/

# Crawl delay for being nice to the server
Crawl-delay: 1

# Popular search engines specific rules
User-agent: Googlebot
Crawl-delay: 1

User-agent: Bingbot
Crawl-delay: 1

User-agent: Slurp
Crawl-delay: 2
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400', // Cache for 24 hours
    },
  });
}