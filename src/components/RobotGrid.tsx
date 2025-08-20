import { RobotCard } from "@/components/RobotCard";
import type { RobotCardData } from "@/lib/types";

interface RobotGridProps {
  robots: RobotCardData[];
}

export function RobotGrid({ robots }: RobotGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {robots.map((robot) => (
        <RobotCard key={robot.id} robot={robot} />
      ))}
    </div>
  );
}