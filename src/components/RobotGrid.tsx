import { RobotCard } from "@/components/RobotCard";
import { CreateRobotCard } from "@/components/CreateRobotCard";
import type { RobotCardData } from "@/lib/types";

interface RobotGridProps {
  robots: RobotCardData[];
}

export function RobotGrid({ robots }: RobotGridProps) {
  const renderGridItems = () => {
    const items = [];
    
    robots.forEach((robot, index) => {
      // Add the first two robots
      if (index < 2) {
        items.push(<RobotCard key={robot.id} robot={robot} />);
      }
      // Add the CreateRobotCard as the third item (index 2)
      else if (index === 2) {
        items.push(<CreateRobotCard key="create-robot-card" />);
        items.push(<RobotCard key={robot.id} robot={robot} />);
      }
      // Add remaining robots normally
      else {
        items.push(<RobotCard key={robot.id} robot={robot} />);
      }
    });
    
    // If there are fewer than 3 robots, still show the CreateRobotCard
    if (robots.length < 3) {
      items.push(<CreateRobotCard key="create-robot-card" />);
    }
    
    return items;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {renderGridItems()}
    </div>
  );
}