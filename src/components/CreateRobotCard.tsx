"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function CreateRobotCard() {
  return (
    <Link href="/create">
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 cursor-pointer border-dashed border-2 border-primary/60 hover:border-primary">
        <CardContent className="flex-1 pt-6 flex flex-col items-center justify-center text-center min-h-[200px]">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-8 w-8 text-primary" />
            </div>

            <div>
              <h3 className="font-semibold text-lg text-primary">
                Share Your Robot
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Add your robot to the list and help others learn from your work
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Click to get started
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
