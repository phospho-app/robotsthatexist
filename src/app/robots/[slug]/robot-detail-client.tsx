"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { withTimeoutAndRetry, swrConfig } from "@/lib/performance";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchGitHubReadme, isValidGitHubUrl } from "@/lib/github";
import { useAuth } from "@/contexts/AuthContext";
import { ReviewForm } from "@/components/ReviewForm";
import { SocialLinkContributionForm } from "@/components/SocialLinkContributionForm";
import { RobotFileList } from "@/components/RobotFileList";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  FileText,
  ExternalLink,
  Play,
  MessageCircle,
  Users,
  Youtube,
  Twitter,
  Edit,
  Plus,
  X,
} from "lucide-react";
import { DiscordIcon, GithubIcon } from "@/components/icons";
import { detectPlatformFromUrl } from "@/lib/platform-utils";
import { TwitterEmbed } from "@/components/TwitterEmbed";
import { MasonryGrid } from "@/components/MasonryGrid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mutate } from "swr";

// Optimized fetcher that loads robot and all related data in parallel
const robotWithDataFetcher = async (slug: string) => {
  return withTimeoutAndRetry(async () => {
    // First get the robot
    const { data: robot, error: robotError } = await supabase
      .from("robots")
      .select(
        `
        *,
        profiles (
          username,
          full_name,
          avatar_url,
          github_username
        )
      `
      )
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (robotError) {
      throw new Error(`Failed to fetch robot: ${robotError.message}`);
    }

    if (!robot) {
      throw new Error("Robot not found");
    }

    // Load all related data in parallel
    const [socialLinksResult, reviewsResult] = await Promise.all([
      supabase
        .from("robot_social_links")
        .select("*")
        .eq("robot_id", robot.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("reviews")
        .select("*")
        .eq("robot_id", robot.id)
        .order("created_at", { ascending: false }),
    ]);

    // For non-anonymous reviews, fetch profile data separately
    const reviews = reviewsResult.data || [];
    const nonAnonymousUserIds = reviews
      .filter((review) => !review.is_anonymous)
      .map((review) => review.user_id);

    let profilesData: any[] = [];
    if (nonAnonymousUserIds.length > 0) {
      const profilesResult = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, github_username")
        .in("id", nonAnonymousUserIds);

      profilesData = profilesResult.data || [];
    }

    // Attach profile data only to non-anonymous reviews
    const reviewsWithProfiles = reviews.map((review) => ({
      ...review,
      profiles: review.is_anonymous
        ? null
        : profilesData.find((profile) => profile.id === review.user_id),
    }));

    return {
      robot,
      socialLinks: socialLinksResult.data || [],
      reviews: reviewsWithProfiles,
      socialLinksError: socialLinksResult.error,
      reviewsError: reviewsResult.error,
    };
  });
};

const readmeFetcher = async (githubUrl: string) => {
  if (!githubUrl || !isValidGitHubUrl(githubUrl)) {
    return null;
  }

  const markdownContent = await fetchGitHubReadme(githubUrl);
  if (!markdownContent) {
    return null;
  }

  // Render markdown using GitHub's API
  try {
    const response = await fetch("/api/render-markdown", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        markdown: markdownContent,
        repoUrl: githubUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn("GitHub Markdown API error:", errorData.error);

      // If it's a rate limit or fallback situation, return raw markdown
      if (errorData.fallback || response.status === 429) {
        console.info("Falling back to raw markdown content");
        return markdownContent;
      }

      throw new Error(`Failed to render markdown: ${response.statusText}`);
    }

    const { html } = await response.json();
    return html;
  } catch (error) {
    console.error("Error rendering markdown:", error);
    // Fallback to raw markdown if API fails
    return markdownContent;
  }
};

interface RobotDetailClientProps {
  initialReadme?: string | null;
}

export default function RobotDetailClient({
  initialReadme = null,
}: RobotDetailClientProps) {
  const params = useParams();
  const { user, profile } = useAuth();
  const slug = params?.slug as string;
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showSocialLinkForm, setShowSocialLinkForm] = useState(false);
  const [isReadmeExpanded, setIsReadmeExpanded] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  // Fetch robot and all related data in a single optimized call
  const {
    data: robotData,
    error: robotError,
    isLoading: robotLoading,
  } = useSWR(
    slug ? `robot-with-data-${slug}` : null,
    () => robotWithDataFetcher(slug),
    {
      ...swrConfig,
      dedupingInterval: 60000, // Cache for 1 minute since robot data changes infrequently
    }
  );

  // Extract data from the combined response
  const robot = robotData?.robot;
  const socialLinks = robotData?.socialLinks || [];
  const reviews = robotData?.reviews || [];

  // Fetch GitHub README (now pre-rendered HTML) - only if not provided server-side
  const { data: githubReadme, error: readmeError } = useSWR<string | null>(
    robot?.github_url && !initialReadme ? `readme-${robot.github_url}` : null,
    () => readmeFetcher(robot!.github_url!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes
    }
  );

  // Use server-side README if available, otherwise use client-side fetched
  const displayReadme = initialReadme || githubReadme;

  // Trigger background README cache refresh on client-side (for future requests)
  useEffect(() => {
    if (robot?.id && robot?.github_url && initialReadme) {
      // Only refresh if we have server-side README (meaning cache exists)
      // This triggers background update for next visitors
      fetch("/api/refresh-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotId: robot.id }),
      }).catch((error) => {
        console.warn("Background cache refresh failed:", error);
      });
    }
  }, [robot?.id, robot?.github_url, initialReadme]);

  // Function to handle social link deletion
  const handleDeleteSocialLink = async (linkId: string) => {
    if (!user || !robot) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this social link?"
    );
    if (!confirmed) return;

    setDeletingLinkId(linkId);

    try {
      const { error } = await supabase
        .from("robot_social_links")
        .delete()
        .eq("id", linkId);

      if (error) {
        console.error("Error deleting social link:", error);
        throw error;
      }

      // Revalidate the robot data
      await mutate(`robot-with-data-${slug}`);
    } catch (error: any) {
      console.error("Error deleting social link:", error);
    } finally {
      setDeletingLinkId(null);
    }
  };

  // Check if user can delete a specific social link
  const canDeleteLink = (link: any) => {
    if (!user || !robot) return false;
    return (
      profile?.role === "admin" ||
      robot.creator_id === user.id ||
      link.user_id === user.id
    );
  };

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

  // Check if current user has already reviewed this robot
  const userReview =
    user && reviews.find((review) => review.user_id === user.id);

  const getSocialIcon = (link: any) => {
    // Auto-detect platform if not already detected, or use existing platform
    const detectedPlatform = link.platform || detectPlatformFromUrl(link.url);

    switch (detectedPlatform) {
      case "github":
        return <GithubIcon className="h-5 w-5" />;
      case "discord":
        return <DiscordIcon className="h-5 w-5" />;
      case "youtube":
        return <Youtube className="h-5 w-5" />;
      case "twitter":
        return <Twitter className="h-5 w-5" />;
      case "documentation":
        return <FileText className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  const getYouTubeVideoId = (url: string) => {
    // Support regular YouTube videos, Shorts, and youtu.be links
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
      /youtu\.be\/([^"&?\/\s]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const getTweetId = (url: string) => {
    // Support both twitter.com and x.com URLs
    const patterns = [
      /(?:twitter|x)\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/,
      /(?:twitter|x)\.com\/(\w+)\/status\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[2]; // Return the tweet ID (last captured group)
    }

    return null;
  };

  const sortedSocialLinks = socialLinks.sort((a, b) => {
    // Discord always first
    if (a.platform === "discord") return -1;
    if (b.platform === "discord") return 1;
    // Then by creation date
    return 0;
  });

  if (robotError) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">Failed to Load Robot</h1>
        <p className="text-muted-foreground mb-6">
          {robotError.message ||
            "Something went wrong while fetching robot data."}
        </p>
        <div className="space-x-4">
          <Button onClick={() => window.location.reload()}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (robotLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-2xl font-bold mb-2">Robot Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The robot you&apos;re looking for doesn&apos;t exist or is not
          published.
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{robot.name}</h1>
            <p className="text-xl text-muted-foreground mb-4">
              {robot.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {robot.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>

            {/* Rating and Quick Links Row */}
            <div className="flex items-center justify-start gap-x-2 mb-4">
              <div className="flex items-center space-x-4">
                {/* Rating */}
                {reviews.length > 0 ? (
                  <div className="flex items-center space-x-2 p-2 rounded">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold ml-1">
                        {averageRating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      ({reviews.length}{" "}
                      {reviews.length === 1 ? "story" : "stories"})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 p-2">
                    <Star className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      No stories yet.
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="flex items-center space-x-3">
                {robot.github_url && (
                  <a
                    href={robot.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <GithubIcon className="h-5 w-5" />
                    <span className="sr-only">GitHub Repository</span>
                  </a>
                )}
                {socialLinks.find((link) => link.platform === "discord") && (
                  <a
                    href={
                      socialLinks.find((link) => link.platform === "discord")
                        ?.url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <DiscordIcon className="h-5 w-5" />
                    <span className="sr-only">Discord Community</span>
                  </a>
                )}
                {socialLinks.find(
                  (link) => link.platform === "documentation"
                ) && (
                  <a
                    href={
                      socialLinks.find(
                        (link) => link.platform === "documentation"
                      )?.url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="sr-only">Documentation</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Edit Button - visible to admin or creator */}
          {user &&
            (profile?.role === "admin" || robot.creator_id === user.id) && (
              <div className="flex-shrink-0">
                <Button asChild>
                  <Link
                    href={`/admin/robots/${
                      robot.id
                    }/edit?returnTo=${encodeURIComponent(
                      `/robots/${robot.slug}`
                    )}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Robot
                  </Link>
                </Button>
              </div>
            )}
        </div>

        {/* Image */}
        {robot.image_url && (
          <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100 mb-6">
            <Image
              src={robot.image_url}
              alt={robot.name}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* GitHub README Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <GithubIcon className="h-6 w-6 mr-2" />
            README
          </h2>
          {displayReadme ? (
            <Card>
              <CardContent>
                {displayReadme?.startsWith("<") ? (
                  // Render pre-processed HTML from GitHub API
                  <div className="relative">
                    <div
                      className={`markdown-body transition-all duration-300 overflow-hidden ${
                        isReadmeExpanded ? "" : "max-h-[50vh]"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: displayReadme,
                      }}
                    />
                    <div className="mt-6 flex justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full max-w-xs px-8 py-3"
                        onClick={() => setIsReadmeExpanded(!isReadmeExpanded)}
                      >
                        {isReadmeExpanded ? "Show Less" : "Show more"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Fallback to client-side markdown rendering
                  <div className="relative">
                    <div
                      className={`github-markdown-body prose prose-sm max-w-none transition-all duration-300 overflow-hidden ${
                        isReadmeExpanded ? "" : "max-h-[50vh]"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img(props) {
                            const { src, alt, ...rest } = props;
                            const srcString =
                              typeof src === "string" ? src : "";
                            let imgSrc = srcString;

                            if (!srcString.startsWith("http")) {
                              if (srcString.startsWith("/")) {
                                imgSrc = `https://github.com${srcString}`;
                              } else {
                                imgSrc = robot.github_url
                                  ? `${robot.github_url
                                      .replace(
                                        "github.com",
                                        "raw.githubusercontent.com"
                                      )
                                      .replace("/tree/", "/")
                                      .replace(
                                        "/blob/",
                                        "/"
                                      )}/main/${srcString}`
                                  : srcString;
                              }
                            }

                            return (
                              <Image
                                {...rest}
                                src={imgSrc}
                                alt={alt || ""}
                                width={800}
                                height={600}
                                className="max-w-full h-auto rounded-lg"
                                loading="lazy"
                              />
                            );
                          },
                          a(props) {
                            const { href, children, ...rest } = props;
                            const linkHref = href?.startsWith("http")
                              ? href
                              : href?.startsWith("/")
                              ? `https://github.com${href}`
                              : robot.github_url && href
                              ? `${robot.github_url}/blob/main/${href}`
                              : href;
                            return (
                              <a
                                {...rest}
                                href={linkHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {displayReadme}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-6 flex justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full max-w-xs px-8 py-3"
                        onClick={() => setIsReadmeExpanded(!isReadmeExpanded)}
                      >
                        {isReadmeExpanded ? "Show Less" : "Show more"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : readmeError ? (
            <Card>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    Failed to load README from GitHub
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {readmeError.message ||
                      "The repository might be private or the README might not exist."}
                  </p>
                  {robot.github_url && (
                    <Button variant="outline" asChild>
                      <a
                        href={robot.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <GithubIcon className="h-4 w-4 mr-2" />
                        View Repository on GitHub
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : robot.github_url ? (
            <Card>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  View the source code and documentation on GitHub.
                </p>
                <Button asChild>
                  <a
                    href={robot.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GithubIcon className="h-4 w-4 mr-2" />
                    View Repository
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No detailed information available for this robot yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Social Links Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Users className="h-6 w-6 mr-2" />
              Social & Community
            </h2>
            {user && !showSocialLinkForm && (
              <Button
                onClick={() => setShowSocialLinkForm(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            )}
          </div>

          {/* Add Social Link Form */}
          {showSocialLinkForm && robot && (
            <div className="mb-6">
              <SocialLinkContributionForm
                robotId={robot.id}
                robotSlug={robot.slug}
                onSubmitted={() => setShowSocialLinkForm(false)}
              />
              <Button
                onClick={() => setShowSocialLinkForm(false)}
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                Cancel
              </Button>
            </div>
          )}
          {sortedSocialLinks.length > 0 ? (
            <MasonryGrid gap="1.5rem">
              {sortedSocialLinks.map((link) => {
                // Discord Card (Special Treatment)
                if (link.platform === "discord") {
                  return (
                    <Card
                      key={link.id}
                      className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20 h-fit"
                    >
                      <CardContent className="p-4">
                        <div className="relative">
                          {/* Delete Button - Top Right */}
                          {canDeleteLink(link) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSocialLink(link.id)}
                              disabled={deletingLinkId === link.id}
                              className="absolute top-0 right-0 h-6 w-6 p-0 text-blue-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}

                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-500 rounded-lg">
                                <DiscordIcon className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
                                  {link.title || "Discord Server"}
                                </h3>
                              </div>
                            </div>

                            <Button
                              asChild
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Join Server
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // YouTube Card with Video Preview
                if (link.platform === "youtube") {
                  const videoId = getYouTubeVideoId(link.url);
                  return (
                    <Card
                      key={link.id}
                      className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20 h-fit"
                    >
                      <CardContent className="p-0">
                        {videoId && (
                          <div className="relative aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              title={link.title || "YouTube video"}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full rounded-t-lg"
                            />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="relative">
                            {/* Delete Button - Top Right */}
                            {canDeleteLink(link) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSocialLink(link.id)}
                                disabled={deletingLinkId === link.id}
                                className="absolute top-0 right-0 h-6 w-6 p-0 text-red-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}

                            <div className="flex flex-col space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-1.5 bg-red-500 rounded-lg">
                                  <Youtube className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-red-700 dark:text-red-300 text-sm">
                                    {link.title || "YouTube Video"}
                                  </h3>
                                </div>
                              </div>

                              <Button
                                asChild
                                size="sm"
                                className="bg-red-500 hover:bg-red-600"
                              >
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Watch on YouTube
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Twitter Card with Embed
                if (link.platform === "twitter") {
                  const tweetId = getTweetId(link.url);
                  return (
                    <Card
                      key={link.id}
                      className="border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-900/20 h-fit"
                    >
                      <CardContent className="p-0">
                        {tweetId && (
                          <div className="p-3 bg-white dark:bg-gray-900 rounded-t-lg">
                            <TwitterEmbed tweetId={tweetId} />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="relative">
                            {/* Delete Button - Top Right */}
                            {canDeleteLink(link) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSocialLink(link.id)}
                                disabled={deletingLinkId === link.id}
                                className="absolute top-0 right-0 h-6 w-6 p-0 text-sky-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}

                            <div className="flex flex-col space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-1.5 bg-sky-500 rounded-lg">
                                  <Twitter className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-sky-700 dark:text-sky-300 text-sm">
                                    {link.title || "Twitter Post"}
                                  </h3>
                                </div>
                              </div>
                              <Button
                                asChild
                                size="sm"
                                className="bg-sky-500 hover:bg-sky-600"
                              >
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  View on X
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Generic Card for other platforms
                return (
                  <Card key={link.id} className="h-fit">
                    <CardContent className="p-4">
                      <div className="relative">
                        {/* Delete Button - Top Right */}
                        {canDeleteLink(link) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSocialLink(link.id)}
                            disabled={deletingLinkId === link.id}
                            className="absolute top-0 right-0 h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}

                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-1.5 bg-gray-500 rounded-lg">
                              {getSocialIcon(link)}
                            </div>
                            <div>
                              <h3 className="font-semibold capitalize text-sm">
                                {link.title || link.platform || "External Link"}
                              </h3>
                            </div>
                          </div>
                          <Button
                            asChild
                            size="sm"
                            className="bg-gray-500 hover:bg-gray-600"
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Visit Link
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </MasonryGrid>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No social links or community resources available yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reviews Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Star className="h-6 w-6 mr-2" />
            Stories ({reviews.length})
          </h2>
          {/* Review Form */}
          {user && !userReview && !showReviewForm && (
            <div className="text-center mb-6">
              <Button onClick={() => setShowReviewForm(true)}>
                <Star className="h-4 w-4 mr-2" />
                Write a story
              </Button>
            </div>
          )}

          {user && userReview && !showReviewForm && (
            <div className="text-center mb-6">
              <Button variant="outline" onClick={() => setShowReviewForm(true)}>
                Edit Your story
              </Button>
            </div>
          )}

          {showReviewForm && robot && (
            <div className="mb-6">
              <ReviewForm
                robotId={robot.id}
                existingReview={userReview}
                mutateKey={`robot-with-data-${slug}`}
                onReviewSubmitted={() => setShowReviewForm(false)}
              />
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => {
                const isCurrentUserReview = user && review.user_id === user.id;

                return (
                  <Card
                    key={review.id}
                    className={
                      isCurrentUserReview
                        ? "border-primary/20 bg-primary/5"
                        : ""
                    }
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={
                                review.is_anonymous
                                  ? ""
                                  : review.profiles?.avatar_url || ""
                              }
                            />
                            <AvatarFallback>
                              {review.is_anonymous
                                ? "A"
                                : review.profiles?.full_name?.charAt(0) ||
                                  review.profiles?.username?.charAt(0) ||
                                  "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {review.is_anonymous ? (
                                "Anonymous User"
                              ) : review.profiles?.github_username ? (
                                <a
                                  href={`https://github.com/${review.profiles.github_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
                                >
                                  {review.profiles?.full_name ||
                                    review.profiles?.username ||
                                    review.profiles.github_username}
                                </a>
                              ) : (
                                review.profiles?.full_name ||
                                review.profiles?.username ||
                                "User"
                              )}
                              {isCurrentUserReview && (
                                <Badge variant="secondary" className="text-xs">
                                  Your Story
                                </Badge>
                              )}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(
                                  review.created_at
                                ).toLocaleDateString()}
                                {review.updated_at !== review.created_at &&
                                  " (edited)"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isCurrentUserReview && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowReviewForm(true)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className="text-muted-foreground war-story-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {review.comment}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : !user ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center mb-4">
                  No stories yet. Sign in to be the first to share your
                  experience with this robot!
                </p>
                <div className="text-center">
                  <Button asChild>
                    <Link href="/auth/login">Sign In to share</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !showReviewForm ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center mb-4">
                  No stories yet. Be the first to share your experience with
                  this robot!
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Files Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <FileText className="h-6 w-6 mr-2" />
            Files
          </h2>
          <RobotFileList
            robotId={robot.id}
            isOwner={robot.creator_id === user?.id}
          />
        </div>
      </div>
    </div>
  );
}
