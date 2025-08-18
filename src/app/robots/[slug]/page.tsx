import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchRobotForSSR,
  generateRobotStructuredData,
} from "@/lib/server-fetchers";
import RobotDetailClient from "./robot-detail-client";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { robot, averageRating, reviewCount } = await fetchRobotForSSR(slug);

  if (!robot) {
    return {
      title: "Robot Not Found - Robots That Exist",
      description: "The robot you're looking for could not be found.",
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://robotsthatexist.com";
  const robotUrl = `${baseUrl}/robots/${robot.slug}`;
  const ogImageUrl = robot.image_url || `${baseUrl}/og-image.png`;

  // Create rich description
  const ratingText =
    reviewCount > 0
      ? ` ⭐ ${averageRating.toFixed(1)}/5 (${reviewCount} stories)`
      : "";

  const tagsText =
    robot.tags.length > 0
      ? ` • Tags: ${robot.tags.slice(0, 3).join(", ")}`
      : "";

  const creatorText =
    robot.profiles?.full_name || robot.profiles?.username
      ? ` • Created by ${robot.profiles.full_name || robot.profiles.username}`
      : "";

  const description = `${robot.description}${ratingText}${tagsText}${creatorText}`;

  return {
    title: `${robot.name} - Robot Details | Robots That Exist`,
    description: description.slice(0, 160), // SEO description limit
    keywords: [
      robot.name,
      "robot",
      "robotics",
      "URDF",
      "STL",
      "3D model",
      ...robot.tags,
      "open source",
      "community",
    ].join(", "),
    authors: [
      {
        name:
          robot.profiles?.full_name || robot.profiles?.username || "Anonymous",
        url: robot.profiles?.github_username
          ? `https://github.com/${robot.profiles.github_username}`
          : undefined,
      },
    ],
    creator:
      robot.profiles?.full_name || robot.profiles?.username || "Anonymous",
    publisher: "Robots That Exist",
    openGraph: {
      title: `${robot.name} - Robot Community`,
      description: description.slice(0, 200),
      url: robotUrl,
      siteName: "Robots That Exist",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${robot.name} - Robot preview image`,
        },
      ],
      locale: "en_US",
      type: "article",
      publishedTime: robot.created_at,
      modifiedTime: robot.updated_at,
      section: "Robotics",
      tags: robot.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: `${robot.name} - Robot Details`,
      description: description.slice(0, 200),
      images: [ogImageUrl],
      creator: robot.profiles?.github_username
        ? `@${robot.profiles.github_username}`
        : "@robotsthatexist",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: robotUrl,
    },
    other: {
      "theme-color": "#00ff7f",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
    },
  };
}

// Server-side component with initial data for SEO
export default async function RobotDetailPage({ params }: Props) {
  const { slug } = await params;
  const { robot, reviews, socialLinks, averageRating, reviewCount, readme } =
    await fetchRobotForSSR(slug);

  if (!robot) {
    notFound();
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://robotsthatexist.com";
  const structuredData = generateRobotStructuredData(
    robot,
    reviews,
    averageRating,
    baseUrl,
    readme
  );

  return (
    <>
      {/* Structured Data for Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* Server-rendered content for SEO - hidden but crawlable */}
      <div className="sr-only">
        <h1>{robot.name}</h1>
        <p>{robot.description}</p>

        {/* Tags for SEO */}
        <div>Tags: {robot.tags.join(", ")}</div>

        {/* Creator info */}
        {robot.profiles && (
          <div>
            Created by: {robot.profiles.full_name || robot.profiles.username}
          </div>
        )}

        {/* Reviews for SEO */}
        {reviews.length > 0 && (
          <div>
            <h2>Ratings ({reviewCount})</h2>
            <div>Average rating: {averageRating.toFixed(1)} out of 5 stars</div>
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id}>
                <div>Rating: {review.rating}/5</div>
                <div>Story: {review.comment}</div>
                <div>
                  By:{" "}
                  {review.profiles?.full_name ||
                    review.profiles?.username ||
                    "Anonymous"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div>
            <h2>Links</h2>
            {socialLinks.map((link) => (
              <a key={link.id} href={link.url} rel="noopener noreferrer">
                {link.platform}: {link.title || link.url}
              </a>
            ))}
          </div>
        )}

        {/* GitHub link */}
        {robot.github_url && (
          <div>
            <a href={robot.github_url} rel="noopener noreferrer">
              GitHub Repository: {robot.github_url}
            </a>
          </div>
        )}

        {/* README content for SEO */}
        {readme && (
          <div>
            <h2>Documentation</h2>
            <div>
              {readme.slice(0, 2000).replace(/[#*`]/g, "").trim()}
              {readme.length > 2000 && "..."}
            </div>
          </div>
        )}
      </div>

      {/* Client-side interactive component */}
      <RobotDetailClient initialReadme={readme} />
    </>
  );
}
