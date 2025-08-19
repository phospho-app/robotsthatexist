import { Metadata } from "next";
import RobotsPageClient from "./robots-page-client";

export const metadata: Metadata = {
  title: "Browse All Robots - Real Robot Catalog",
  description:
    "Browse real robots with complete build information including budgets, ratings, and community reviews. Filter by tags, search by name, and find URDF files, STL models, and documentation for robots that actually exist.",
  keywords: [
    "browse robots",
    "robot collection",
    "robotics projects",
    "robot budgets",
    "robot costs",
    "robot reviews",
    "robot ratings",
    "robots BOM",
    "robots costs",
    "robots price",
    "URDF files",
    "STL models",
    "robot downloads",
    "open source robots",
    "robotics community",
    "mechanical design",
    "robot catalog",
    "automation projects",
    "ROS robots",
  ].join(", "),
  openGraph: {
    title: "Browse All Robots - Robots That Exist",
    description:
      "Browse real robots with build information, budgets, ratings, and reviews. Find URDF files, STL models, and documentation for robots that actually exist.",
    url: "/robots",
    images: [
      {
        url: "/og-robots.png",
        width: 1200,
        height: 630,
        alt: "Browse robots - Real robot catalog with build info",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse All Robots - Robots That Exist",
    description:
      "Browse real robots with build information, budgets, ratings, and reviews. Find URDF files, STL models, and documentation for robots that actually exist.",
    images: ["/og-robots.png"],
  },
  alternates: {
    canonical: "/robots",
  },
};

export default function RobotsPage() {
  return <RobotsPageClient />;
}
