"use client"

import * as React from "react"
import { DollarSign } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface BudgetDisplayProps {
  budget: string
  className?: string
}

export function BudgetDisplay({ budget, className }: BudgetDisplayProps) {
  if (!budget) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center space-x-1 text-sm text-muted-foreground cursor-help", className)}>
            <DollarSign className="h-4 w-4" />
            <span>{budget}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Budget</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}