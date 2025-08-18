import { Metadata } from "next";
import RobotsPageClient from "./robots-page-client";

export const metadata: Metadata = {
  title: "Browse All Robots - Discover Amazing Robotics Projects",
  description: "Explore our complete collection of open-source robots. Filter by tags, search by name, and discover URDF files, STL models, and documentation from the robotics community.",
  keywords: [
    "browse robots",
    "robot collection",
    "robotics projects",
    "URDF files",
    "STL models",
    "robot downloads",
    "open source robots",
    "robotics community",
    "mechanical design",
    "robot catalog",
    "automation projects",
    "ROS robots"
  ].join(", "),
  openGraph: {
    title: "Browse All Robots - Robotics Community",
    description: "Explore our complete collection of open-source robots. Find URDF files, STL models, and documentation.",
    url: "/robots",
    images: [
      {
        url: "/og-robots.png",
        width: 1200,
        height: 630,
        alt: "Browse robots - Collection of amazing robotics projects",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse All Robots - Robotics Community",
    description: "Explore our complete collection of open-source robots. Find URDF files, STL models, and documentation.",
    images: ["/og-robots.png"],
  },
  alternates: {
    canonical: "/robots",
  },
};

export default function RobotsPage() {
  return <RobotsPageClient />;
}