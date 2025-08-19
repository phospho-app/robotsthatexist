"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getBudgetOptions, getBudgetOptionsWithEmpty } from "@/lib/budget-config"

interface BudgetSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function BudgetSelector({
  value,
  onValueChange,
  placeholder = "Select budget range",
  disabled = false,
  required = false,
  className,
}: BudgetSelectorProps) {
  // Use different option sets based on whether the field is required
  const options = required ? getBudgetOptions() : getBudgetOptionsWithEmpty()

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}