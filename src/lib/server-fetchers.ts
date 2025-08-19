// Server-side data fetchers for SEO optimization
// These run on the server and provide initial data to search engines

import { supabase } from "./supabase";
import { getCachedReadmeSSR } from "./readme-cache";
import type { ServerSocialLink } from "./types";

export interface ServerRobot {
  id: string;
  name: string;
  slug: string;
  description: string;
  github_url: string | null;
  image_url: string | null;
  budget: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    github_username: string | null;
  };
}

export interface ServerReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
  };
}


/**
 * Fetch robot data for server-side rendering
 */
export async function fetchRobotForSSR(slug: string): Promise<{
  robot: ServerRobot | null;
  reviews: ServerReview[];
  socialLinks: ServerSocialLink[];
  averageRating: number;
  reviewCount: number;
  readme: string | null;
}> {
  try {
    // Fetch robot data
    const { data: robot, error: robotError } = await supabase
      .from("robots")
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
          github_username
        )
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (robotError || !robot) {
      return {
        robot: null,
        reviews: [],
        socialLinks: [],
        averageRating: 0,
        reviewCount: 0,
        readme: null,
      };
    }

    // Fetch reviews, social links, and README in parallel
    const [reviewsResult, socialLinksResult, readme] = await Promise.all([
      supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles (
            username,
            full_name
          )
        `)
        .eq("robot_id", robot.id)
        .order("created_at", { ascending: false })
        .limit(10), // Limit for performance

      supabase
        .from("robot_social_links")
        .select("id, platform, url, title")
        .eq("robot_id", robot.id)
        .order("created_at", { ascending: false }),

      // Get cached README (SSR-optimized, no background updates)
      getCachedReadmeSSR(robot.id, robot.github_url)
    ]);

    const reviews = reviewsResult.data || [];
    const socialLinks = socialLinksResult.data || [];

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

    return {
      robot: {
        ...robot,
        profiles: robot.profiles?.[0] || robot.profiles
      } as ServerRobot,
      reviews: reviews.map(review => ({
        ...review,
        profiles: review.profiles?.[0] || review.profiles
      })) as ServerReview[],
      socialLinks: socialLinks as ServerSocialLink[],
      averageRating,
      reviewCount: reviews.length,
      readme,
    };
  } catch (error) {
    console.error("Error fetching robot for SSR:", error);
    return {
      robot: null,
      reviews: [],
      socialLinks: [],
      averageRating: 0,
      reviewCount: 0,
      readme: null,
    };
  }
}

/**
 * Fetch robots list for server-side rendering
 */
export async function fetchRobotsForSSR(limit: number = 50): Promise<ServerRobot[]> {
  try {
    const { data: robots, error } = await supabase
      .from("robots")
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
          github_username
        )
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching robots for SSR:", error);
      return [];
    }

    return (robots || []).map(robot => ({
      ...robot,
      profiles: robot.profiles?.[0] || robot.profiles
    })) as ServerRobot[];
  } catch (error) {
    console.error("Error fetching robots for SSR:", error);
    return [];
  }
}

/**
 * Fetch robot slugs for static generation
 */
export async function fetchRobotSlugsForSSG(): Promise<string[]> {
  try {
    const { data: robots, error } = await supabase
      .from("robots")
      .select("slug")
      .eq("status", "published");

    if (error) {
      console.error("Error fetching robot slugs for SSG:", error);
      return [];
    }

    return (robots || []).map(robot => robot.slug);
  } catch (error) {
    console.error("Error fetching robot slugs for SSG:", error);
    return [];
  }
}

/**
 * Generate structured data for robots
 */
export function generateRobotStructuredData(
  robot: ServerRobot,
  reviews: ServerReview[],
  averageRating: number,
  baseUrl: string,
  readme?: string | null
) {
  // Create enhanced description with README excerpt
  const enhancedDescription = readme 
    ? `${robot.description} ${readme.slice(0, 300).replace(/[#*`]/g, '').trim()}...`
    : robot.description;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: robot.name,
    description: enhancedDescription,
    url: `${baseUrl}/robots/${robot.slug}`,
    image: robot.image_url || `${baseUrl}/og-image.png`,
    brand: {
      "@type": "Organization",
      name: robot.profiles?.full_name || robot.profiles?.username || "Anonymous"
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/robots/${robot.slug}`
    },
    aggregateRating: reviews.length > 0 ? {
      "@type": "AggregateRating",
      ratingValue: averageRating.toFixed(1),
      reviewCount: reviews.length,
      bestRating: "5",
      worstRating: "1"
    } : undefined,
    review: reviews.slice(0, 5).map(review => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: "5",
        worstRating: "1"
      },
      author: {
        "@type": "Person",
        name: review.profiles?.full_name || review.profiles?.username || "Anonymous"
      },
      reviewBody: review.comment,
      datePublished: review.created_at
    })),
    additionalProperty: robot.tags.map(tag => ({
      "@type": "PropertyValue",
      name: "category",
      value: tag
    })),
    sameAs: robot.github_url ? [robot.github_url] : []
  };

  return structuredData;
}