import Fuse from 'fuse.js';
import type { RobotData } from './robot-data';

export interface SearchableRobot {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  created_at: string;
  status: string;
  [key: string]: any;
}

// Fuse.js configuration for optimal fuzzy search
const fuseOptions = {
  // Keys to search in, with weights
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'slug', weight: 0.3 },
    { name: 'description', weight: 0.2 },
    { name: 'tags', weight: 0.1 }
  ],
  // Include score and matches for debugging
  includeScore: true,
  includeMatches: true,
  // Threshold for fuzzy matching (0.0 = exact, 1.0 = match anything)
  threshold: 0.4,
  // At what point does the match algorithm give up (0.0 = perfect, 1.0 = anything)
  distance: 100,
  // Minimum character length for a match
  minMatchCharLength: 1,
  // Use extended search for better tokenization
  useExtendedSearch: false,
  // Ignore case and location
  isCaseSensitive: false,
  shouldSort: true,
  // Find all matches or just the first one
  findAllMatches: false,
};

// Create and configure a Fuse instance
export const createFuseInstance = (robots: SearchableRobot[]) => {
  return new Fuse(robots, fuseOptions);
};

// Preprocess search query for better matching
const preprocessQuery = (query: string): string => {
  return query
    .trim()
    .toLowerCase()
    // Normalize common separators
    .replace(/[\s\-_\.]+/g, ' ')
    // Remove extra spaces
    .replace(/\s+/g, ' ');
};

// Client-side search function using Fuse.js
export const searchRobotsClientSide = <T extends SearchableRobot>(
  robots: T[],
  query: string,
  limit: number = 50
): T[] => {
  if (!query || !query.trim()) {
    return [];
  }

  const preprocessedQuery = preprocessQuery(query);
  const fuse = createFuseInstance(robots);
  
  // Perform the search
  const searchResults = fuse.search(preprocessedQuery, { limit });
  
  // Extract the items from Fuse.js results
  const results = searchResults.map(result => result.item as T);
  
  // Additional post-processing for exact matches
  // If we have an exact match, prioritize it
  const exactMatches = robots.filter(robot => 
    robot.name.toLowerCase() === query.toLowerCase() ||
    robot.slug.toLowerCase() === query.toLowerCase()
  );
  
  if (exactMatches.length > 0) {
    // Remove exact matches from fuzzy results to avoid duplicates
    const fuzzyResults = results.filter(robot => 
      !exactMatches.some(exact => exact.id === robot.id)
    );
    
    // Combine exact matches first, then fuzzy results
    return [...exactMatches, ...fuzzyResults].slice(0, limit);
  }
  
  return results;
};

// Search with tag filtering
export const searchRobotsWithTagFilter = <T extends SearchableRobot>(
  robots: T[],
  query: string,
  tag?: string | null,
  limit: number = 50
): T[] => {
  // First filter by tag if provided
  let filteredRobots = robots;
  if (tag && tag !== 'all') {
    filteredRobots = robots.filter(robot => robot.tags.includes(tag));
  }
  
  // Then search within filtered results
  return searchRobotsClientSide(filteredRobots, query, limit);
};

// Sort search results
export const sortSearchResults = <T extends SearchableRobot>(
  results: T[],
  sortBy: 'newest' | 'oldest' | 'name' | 'relevance' | 'rating' = 'relevance'
): T[] => {
  switch (sortBy) {
    case 'newest':
      return [...results].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case 'oldest':
      return [...results].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case 'name':
      return [...results].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    case 'rating':
      return [...results].sort((a, b) => {
        const aRating = (a as any).average_rating || 0;
        const bRating = (b as any).average_rating || 0;
        return bRating - aRating;
      });
    case 'relevance':
    default:
      // Results are already sorted by relevance from Fuse.js
      return results;
  }
};

// Comprehensive search function that combines all features
export const comprehensiveSearch = <T extends SearchableRobot>(
  robots: T[],
  query: string,
  options: {
    tag?: string | null;
    sortBy?: 'newest' | 'oldest' | 'name' | 'relevance' | 'rating';
    limit?: number;
  } = {}
): T[] => {
  const { tag, sortBy = 'relevance', limit = 50 } = options;
  
  if (!query || !query.trim()) {
    // If no query, just filter by tag and sort
    const filtered = tag && tag !== 'all' 
      ? robots.filter(robot => robot.tags.includes(tag))
      : robots;
      
    return sortSearchResults(filtered, sortBy).slice(0, limit);
  }
  
  const searchResults = searchRobotsWithTagFilter(robots, query, tag, limit);
  return sortSearchResults(searchResults, sortBy);
};