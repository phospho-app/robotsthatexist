/**
 * Platform detection utilities
 * Automatically detects social media platform from URL domain
 */

export type PlatformType = 
  | 'github'
  | 'discord' 
  | 'youtube'
  | 'twitter'
  | 'documentation'
  | 'website';

/**
 * Detect platform from URL domain
 * @param url - The URL to analyze
 * @param manualCategory - Optional manual override (e.g., 'docs' for documentation)
 * @returns Detected platform type
 */
export function detectPlatformFromUrl(url: string, manualCategory?: string): PlatformType {
  if (!url) return 'website';

  // Handle manual category override
  if (manualCategory === 'docs' || manualCategory === 'documentation') {
    return 'documentation';
  }

  const urlLower = url.toLowerCase();

  // GitHub detection
  if (urlLower.includes('github.com')) {
    return 'github';
  }

  // Discord detection (various discord domains)
  if (urlLower.includes('discord.gg') || 
      urlLower.includes('discord.com/invite') || 
      urlLower.includes('discordapp.com/invite')) {
    return 'discord';
  }

  // YouTube detection
  if (urlLower.includes('youtube.com') || 
      urlLower.includes('youtu.be')) {
    return 'youtube';
  }

  // Twitter/X detection
  if (urlLower.includes('twitter.com') || 
      urlLower.includes('x.com')) {
    return 'twitter';
  }

  // Documentation patterns (common doc domains)
  if (urlLower.includes('docs.') || 
      urlLower.includes('documentation.') ||
      urlLower.includes('wiki.') ||
      urlLower.includes('manual.') ||
      urlLower.includes('guide.') ||
      urlLower.includes('readme.') ||
      urlLower.includes('/docs/') ||
      urlLower.includes('/documentation/') ||
      urlLower.includes('/wiki/') ||
      urlLower.includes('/manual/') ||
      urlLower.includes('gitbook.io') ||
      urlLower.includes('notion.so') ||
      urlLower.includes('gitiles.')) {
    return 'documentation';
  }

  // Default to website for unknown domains
  return 'website';
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: PlatformType): string {
  const names: Record<PlatformType, string> = {
    github: 'GitHub',
    discord: 'Discord',
    youtube: 'YouTube', 
    twitter: 'Twitter',
    documentation: 'Documentation',
    website: 'Website'
  };
  
  return names[platform] || 'Website';
}

/**
 * Get platform color theme
 */
export function getPlatformColor(platform: PlatformType): string {
  const colors: Record<PlatformType, string> = {
    github: '#333333',
    discord: '#5865F2',
    youtube: '#FF0000',
    twitter: '#1DA1F2', 
    documentation: '#6B7280',
    website: '#6B7280'
  };
  
  return colors[platform] || '#6B7280';
}

/**
 * Validate if URL is likely valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}