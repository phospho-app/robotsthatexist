import { supabase } from '@/lib/supabase';

export interface SearchableRobot {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  [key: string]: any;
}

export interface SearchResult<T = SearchableRobot> extends SearchableRobot {
  relevanceScore: number;
  originalData: T;
}

export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[\s\-_\.]/g, '') // Remove spaces, dashes, underscores, dots
    .replace(/[^\w]/g, ''); // Remove any remaining non-word characters
};

export const calculateRelevanceScore = (
  robot: SearchableRobot, 
  query: string
): number => {
  const normalizedQuery = normalizeText(query);
  const normalizedName = normalizeText(robot.name);
  const normalizedDesc = normalizeText(robot.description);
  const normalizedSlug = normalizeText(robot.slug);
  const normalizedTags = robot.tags.join(' ').toLowerCase();
  
  let score = 0;
  
  // Exact matches get highest score
  if (robot.name.toLowerCase() === query.toLowerCase()) score += 100;
  if (robot.slug.toLowerCase() === query.toLowerCase()) score += 90;
  
  // Normalized exact matches (handles "SO-100" vs "so100" vs "so 100")
  if (normalizedName === normalizedQuery) score += 95;
  if (normalizedSlug === normalizedQuery) score += 85;
  
  // Starts with matches (both normalized and direct)
  if (normalizedName.startsWith(normalizedQuery)) score += 80;
  if (normalizedSlug.startsWith(normalizedQuery)) score += 75;
  if (robot.name.toLowerCase().startsWith(query.toLowerCase())) score += 70;
  if (robot.slug.toLowerCase().startsWith(query.toLowerCase())) score += 65;
  
  // Partial matches with normalization
  if (normalizedName.includes(normalizedQuery)) score += 60;
  if (normalizedSlug.includes(normalizedQuery)) score += 55;
  
  // Direct string matches (without normalization)
  if (robot.name.toLowerCase().includes(query.toLowerCase())) score += 50;
  if (robot.slug.toLowerCase().includes(query.toLowerCase())) score += 45;
  
  // Special handling for number patterns (like "100" in "SO-100")
  const numberMatches = query.match(/\d+/g);
  if (numberMatches) {
    numberMatches.forEach(num => {
      if (robot.name.includes(num)) score += 40;
      if (robot.slug.includes(num)) score += 35;
      // Extra boost for exact number match in normalized text
      if (normalizedName.includes(num)) score += 45;
    });
  }
  
  // Description matches
  if (normalizedDesc.includes(normalizedQuery)) score += 30;
  if (robot.description.toLowerCase().includes(query.toLowerCase())) score += 25;
  
  // Tag matches
  if (normalizedTags.includes(normalizedQuery)) score += 35;
  if (normalizedTags.includes(query.toLowerCase())) score += 30;
  
  return score;
};

export const searchRobots = async <T extends SearchableRobot>(
  query: string,
  limit: number = 8,
  additionalSelect?: string
): Promise<T[]> => {
  if (!query.trim()) {
    return [];
  }

  // Create broader database query for initial filtering
  const broadQuery = query.length <= 3 ? query : query.substring(0, Math.max(3, query.length - 2));
  
  const selectQuery = additionalSelect 
    ? `id, name, slug, description, tags, created_at, status, ${additionalSelect}`
    : `id, name, slug, description, tags, created_at, status`;

  const { data, error } = await supabase
    .from("robots")
    .select(selectQuery)
    .eq("status", "published")
    .or(`name.ilike.%${broadQuery}%,description.ilike.%${broadQuery}%,tags.cs.{${broadQuery}}`)
    .limit(50); // Get more results for better client-side filtering

  if (error) {
    console.error("Search error:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Apply client-side fuzzy search filtering and scoring
  const scoredResults = data
    .map((robot: any) => ({
      ...(robot as object),
      relevanceScore: calculateRelevanceScore(robot as SearchableRobot, query)
    }))
    .filter(robot => robot.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  // Remove relevanceScore from final results
  return scoredResults.map(({ relevanceScore, ...robot }) => robot as T);
};

export const searchRobotsWithDetails = async (
  query: string,
  limit: number = 8
) => {
  return searchRobots(
    query,
    limit,
    `
    image_url,
    github_url,
    robot_social_links (
      id,
      platform,
      url,
      title
    )
    `
  );
};