import { NextResponse } from "next/server";
import { fetchRobotsForSSR } from "@/lib/server-fetchers";

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://robotsthatexist.com";

  try {
    // Fetch all published robots
    const robots = await fetchRobotsForSSR(1000); // Get up to 1000 robots

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Robots listing page -->
  <url>
    <loc>${baseUrl}/robots</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Individual robot pages -->
  ${robots
    .map(
      (robot) => `
  <url>
    <loc>${baseUrl}/robots/${robot.slug}</loc>
    <lastmod>${robot.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    ${
      robot.image_url
        ? `
    <image:image>
      <image:loc>${robot.image_url}</image:loc>
      <image:title>${robot.name}</image:title>
      <image:caption>${robot.description}</image:caption>
    </image:image>`
        : ""
    }
  </url>`
    )
    .join("")}
</urlset>`;

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400", // Cache for 1 hour, allow stale for 24 hours
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
