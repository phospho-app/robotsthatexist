import { Metadata } from "next";
import CreateRobotClient from "./create-client";

export const metadata: Metadata = {
  title: "Add Robot - Share Your Real Robot Build",
  description: "Add your real robot to the catalog with complete build information including budget, parts list, social links, and documentation. Help others build the same robot with practical details.",
  keywords: [
    "create robot",
    "submit robot",
    "share robot project", 
    "robot budget",
    "robotics community",
    "robot documentation",
    "URDF files",
    "STL files",
    "open source robots"
  ].join(", "),
  robots: {
    index: false, // Don't index the form page itself
    follow: true,
  },
};

export default function CreateRobotPage() {
  return <CreateRobotClient />;
}