import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import type { RobotReviewStats } from "@/lib/types";

const reviewStatsFetcher = async (
  robotId: string
): Promise<RobotReviewStats> => {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("robot_id", robotId);

  if (error) {
    throw new Error(`Failed to fetch review stats: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { average_rating: 0, review_count: 0 };
  }

  const total = data.reduce((sum, review) => sum + review.rating, 0);
  const average = total / data.length;

  return {
    average_rating: Math.round(average * 10) / 10, // Round to 1 decimal place
    review_count: data.length,
  };
};

export function useRobotReviews(robotId: string) {
  return useSWR(
    robotId ? `robot-review-stats-${robotId}` : null,
    () => reviewStatsFetcher(robotId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );
}
