import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import type { RobotCardData } from '@/lib/types';

export interface RobotData extends Omit<RobotCardData, 'status'> {
  created_at: string;
  status: 'published' | 'draft';
  average_rating: number;
}

// Fetcher function to get all robots from database
const fetchAllRobots = async (): Promise<RobotData[]> => {
  try {
    const { data, error } = await supabase
      .from('robots')
      .select(`
        id,
        name,
        slug,
        description,
        github_url,
        image_url,
        tags,
        created_at,
        updated_at,
        profiles (
          username,
          full_name,
          avatar_url,
          github_username
        ),
        robot_social_links (
          id,
          platform,
          url,
          title
        ),
        reviews (
          rating
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching robots:', error);
      throw error;
    }
    
    return processRobotData(data || []);
  } catch (error) {
    console.error('Failed to fetch robots:', error);
    throw error;
  }
};

const processRobotData = (robots: any[]): RobotData[] => {
  // Calculate average rating for each robot from joined review data
  const robotsWithRatings = robots.map((robot) => {
    let average_rating = 0;
    if (robot.reviews && robot.reviews.length > 0) {
      const total = robot.reviews.reduce((sum: number, review: { rating: number }) => sum + review.rating, 0);
      average_rating = Math.round((total / robot.reviews.length) * 10) / 10;
    }

    // Remove reviews from the final object since we only needed it for calculation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reviews, ...robotWithoutReviews } = robot;

    return {
      ...robotWithoutReviews,
      average_rating
    };
  });

  return robotsWithRatings;
};

// Hook to get all robots with SWR caching
export const useAllRobots = () => {
  return useSWR<RobotData[], Error>(
    'all-robots',
    fetchAllRobots,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );
};

// Hook to get robots filtered by tags
export const useRobotsByTag = (tag: string | null) => {
  const { data: allRobots, error, isLoading } = useAllRobots();

  // Filter robots by tag client-side
  const filteredRobots = allRobots?.filter(robot => 
    !tag || tag === 'all' || robot.tags.includes(tag)
  ) || [];

  return {
    data: filteredRobots,
    error,
    isLoading
  };
};

// Get all unique tags with their counts, sorted by occurrence
export const useAllTags = () => {
  const { data: allRobots, error, isLoading } = useAllRobots();

  const tagCounts = allRobots?.reduce((counts: Record<string, number>, robot) => {
    robot.tags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return counts;
  }, {});

  // Sort by count (descending) then by name (ascending)
  const sortedTags = tagCounts ? 
    Object.entries(tagCounts)
      .sort(([tagA, countA], [tagB, countB]) => {
        if (countB !== countA) {
          return countB - countA; // Higher count first
        }
        return tagA.localeCompare(tagB); // Alphabetical for same count
      })
      .map(([tag, count]) => ({ tag, count }))
    : [];

  return {
    data: sortedTags,
    error,
    isLoading
  };
};