// README caching utilities with stale-while-revalidate pattern
import { supabase } from "./supabase";
import { fetchGitHubReadme, isValidGitHubUrl } from "./github";

/**
 * Get cached README HTML for server-side rendering (fast, no background updates)
 * Only returns cached content from database
 */
export async function getCachedReadmeSSR(
  robotId: string, 
  githubUrl: string | null
): Promise<string | null> {
  if (!githubUrl || !isValidGitHubUrl(githubUrl)) {
    return null;
  }

  try {
    // Get cached README from database only (no background updates during SSR)
    const { data: robot } = await supabase
      .from("robots")
      .select("cached_readme_html, readme_updated_at")
      .eq("id", robotId)
      .single();

    return robot?.cached_readme_html || null;
  } catch (error) {
    console.error("Error getting cached README for SSR:", error);
    return null;
  }
}

/**
 * Get cached README HTML with stale-while-revalidate pattern (client-side)
 * Returns cached content immediately, then updates cache in background
 */
export async function getCachedReadme(
  robotId: string, 
  githubUrl: string | null
): Promise<string | null> {
  if (!githubUrl || !isValidGitHubUrl(githubUrl)) {
    return null;
  }

  try {
    // 1. Get cached README from database (fast response)
    const { data: robot } = await supabase
      .from("robots")
      .select("cached_readme_html, readme_updated_at")
      .eq("id", robotId)
      .single();

    const cachedHtml = robot?.cached_readme_html || null;

    // 2. Trigger background update using waitUntil (Vercel-specific)
    if (typeof globalThis !== 'undefined' && 'waitUntil' in globalThis) {
      // @ts-expect-error - Vercel's waitUntil is not in standard types
      globalThis.waitUntil(
        updateReadmeCache(robotId, githubUrl).catch(error => {
          console.error(`Background README update failed for robot ${robotId}:`, error);
        })
      );
    } else {
      // Fallback for non-Vercel environments (development)
      // Don't await - let it run in background
      updateReadmeCache(robotId, githubUrl).catch(error => {
        console.warn(`Background README update failed for robot ${robotId}:`, error);
      });
    }

    return cachedHtml;
  } catch (error) {
    console.error("Error getting cached README:", error);
    return null;
  }
}

/**
 * Update README cache in background with timeout fallback
 */
async function updateReadmeCache(robotId: string, githubUrl: string): Promise<void> {
  const TIMEOUT_MS = 15000; // 15 second timeout

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('README update timeout')), TIMEOUT_MS);
    });

    // Race between README fetch and timeout
    const updatePromise = async () => {
      // Fetch raw README content
      const rawMarkdown = await fetchGitHubReadme(githubUrl);
      if (!rawMarkdown) {
        throw new Error('No README content found');
      }

      // Render to HTML using our markdown API
      const renderResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/render-markdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: rawMarkdown,
          repoUrl: githubUrl
        })
      });

      if (!renderResponse.ok) {
        // If rendering fails, store raw markdown as fallback
        console.warn('Markdown rendering failed, storing raw markdown');
        return rawMarkdown;
      }

      const { html } = await renderResponse.json();
      return html || rawMarkdown;
    };

    // Execute with timeout
    const renderedHtml = await Promise.race([updatePromise(), timeoutPromise]);

    // Update database cache
    const { error } = await supabase
      .from("robots")
      .update({
        cached_readme_html: renderedHtml,
        readme_updated_at: new Date().toISOString()
      })
      .eq("id", robotId);

    if (error) {
      throw error;
    }

    console.log(`Successfully updated README cache for robot ${robotId}`);
  } catch (error) {
    console.error(`Failed to update README cache for robot ${robotId}:`, error);
    // Don't throw - this is background work
  }
}

/**
 * Force refresh README cache (for manual triggers)
 */
export async function refreshReadmeCache(robotId: string, githubUrl: string): Promise<string | null> {
  await updateReadmeCache(robotId, githubUrl);
  
  // Return updated cache
  const { data: robot } = await supabase
    .from("robots")
    .select("cached_readme_html")
    .eq("id", robotId)
    .single();

  return robot?.cached_readme_html || null;
}