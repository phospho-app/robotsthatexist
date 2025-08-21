"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "@/components/ui/link";
import { supabase } from "@/lib/supabase";
import { useAllRobots } from "@/lib/robot-data";
import { searchRobotsClientSide } from "@/lib/client-search-utils";
import { RobotGrid } from "@/components/RobotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { RobotCardData } from "@/lib/types";

// Fetch robots with review stats for home page display
const topRobotsFetcher = async () => {
  // Get robots with their social links and profiles
  const { data: robots, error: robotsError } = await supabase
    .from("robots")
    .select(
      `
      *,
      profiles (
        username,
        full_name,
        avatar_url,
        github_username
      ),
      robot_social_links (
        platform,
        url
      )
    `
    )
    .eq("status", "published");

  if (robotsError) {
    throw new Error(`Failed to fetch robots: ${robotsError.message}`);
  }

  if (!robots || robots.length === 0) {
    return [];
  }

  // Get review stats for each robot
  const robotsWithStats = await Promise.all(
    robots.map(async (robot) => {
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("robot_id", robot.id);

      if (reviewsError || !reviews) {
        return {
          ...robot,
          average_rating: 0,
          review_count: 0,
        };
      }

      const reviewCount = reviews.length;
      const averageRating =
        reviewCount > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          : 0;

      return {
        ...robot,
        average_rating: averageRating,
        review_count: reviewCount,
      };
    })
  );

  // Sort by review quality: first by average rating (if they have reviews), then by review count, then by creation date
  const sortedRobots = robotsWithStats.sort((a, b) => {
    // Robots with reviews come first
    if (a.review_count > 0 && b.review_count === 0) return -1;
    if (a.review_count === 0 && b.review_count > 0) return 1;

    // If both have reviews, sort by average rating first, then by count
    if (a.review_count > 0 && b.review_count > 0) {
      if (a.average_rating !== b.average_rating) {
        return b.average_rating - a.average_rating; // Higher rating first
      }
      return b.review_count - a.review_count; // More reviews first
    }

    // If neither has reviews, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return sortedRobots.slice(0, 100); // Limit to top 100
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch top robots for home page (prioritized by reviews)
  const {
    data: topRobots = [],
    error: topRobotsError,
    isLoading: topRobotsLoading,
  } = useSWR("top-robots", topRobotsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // Cache for 30 seconds
  });

  // Get all robots using the shared SWR hook
  const {
    data: allRobots = [],
    error: allRobotsError,
    isLoading: allRobotsLoading,
  } = useAllRobots();

  const displayedRobots = useMemo(() => {
    if (!searchQuery) {
      // Show top robots when no search query
      return topRobots;
    }

    // Use fuzzy search through all robots when there's a query
    return searchRobotsClientSide(allRobots, searchQuery, 100);
  }, [topRobots, allRobots, searchQuery]);

  const error = topRobotsError || allRobotsError;
  const isLoading = searchQuery ? allRobotsLoading : topRobotsLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-4 mb-8">
        <h1 className="text-4xl text-primary md:text-6xl font-bold pb-6">
          Beyond the marketing fluff: robots that exist.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Robots you can actually learn from, build with, and contribute to.
          Share resources and read stories from the community.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Eg: dog, open source, manipulator..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap mt-4 gap-2 justify-center">
          {[
            "phosphobot",
            "open source",
            "manipulator",
            "rl",
            "hand",
            "humanoid",
            "mobile",
          ].map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Link href={`/robots?tag=${tag}`}>#{tag}</Link>
            </Badge>
          ))}
        </div>
      </section>

      {/* Recent Robots Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">
            {searchQuery
              ? `Search Results (${displayedRobots.length})`
              : "Top Rated Robots"}
          </h2>
          {!searchQuery && (
            <Link
              href="/robots"
              className="text-primary hover:text-primary/80 transition-colors"
              prefetch={false}
            >
              View all →
            </Link>
          )}
        </div>

        {error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">
              Failed to Load Robots
            </h3>
            <p className="text-muted-foreground mb-6">
              {error.message || "Something went wrong while fetching robots."}
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-80 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : displayedRobots.length > 0 ? (
          <RobotGrid robots={displayedRobots as RobotCardData[]} />
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No robots found" : "No robots yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search terms or browse all robots."
                : "Be the first to add a robot to the catalog!"}
            </p>
            {searchQuery ? (
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear search
              </Button>
            ) : (
              <Button asChild>
                <Link href="/create">Add Your Robot</Link>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
