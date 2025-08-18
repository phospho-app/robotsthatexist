"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Youtube, Twitter, FileText, ExternalLink } from "lucide-react";
import { DiscordIcon, GithubIcon } from "@/components/icons";
import { useRobotReviews } from "@/lib/hooks/useRobotReviews";
import { detectPlatformFromUrl } from "@/lib/platform-utils";
import type { RobotCardProps, SocialLink } from "@/lib/types";

export function RobotCard({ robot }: RobotCardProps) {
  const { data: reviewStats } = useRobotReviews(robot.id);

  const getSocialIcon = (link: SocialLink) => {
    // Auto-detect platform if not already detected, or use existing platform
    const detectedPlatform = link.platform || detectPlatformFromUrl(link.url);

    switch (detectedPlatform) {
      case "github":
        return <GithubIcon className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "twitter":
        return <Twitter className="h-4 w-4" />;
      case "discord":
        return <DiscordIcon className="h-4 w-4" />;
      case "documentation":
        return <FileText className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const socialLinks = robot.robot_social_links || [];
  const hasLinks = robot.github_url || socialLinks.length > 0;

  return (
    <Link href={`/robots/${robot.slug}`}>
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <CardContent className="flex-1 pt-6">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
                {robot.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {robot.description}
              </p>
            </div>

            {/* Tags */}
            {robot.tags && robot.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {robot.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {robot.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{robot.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Rating */}
            {reviewStats && reviewStats.review_count > 0 && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium ml-1">
                    {reviewStats.average_rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({reviewStats.review_count}{" "}
                  {reviewStats.review_count === 1 ? "war story" : "war stories"}
                  )
                </span>
              </div>
            )}
          </div>
        </CardContent>

        {hasLinks && (
          <CardFooter className="pt-3 border-t">
            <div className="flex justify-center items-center gap-3 w-full">
              {robot.github_url && (
                <div className="text-muted-foreground">
                  <GithubIcon className="h-4 w-4" />
                  <span className="sr-only">GitHub Repository</span>
                </div>
              )}
              {socialLinks.map((link, index) => (
                <div
                  key={link.id || `${link.platform}-${link.url}-${index}`}
                  className="text-muted-foreground"
                >
                  {getSocialIcon(link)}
                  <span className="sr-only">{link.platform}</span>
                </div>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}
