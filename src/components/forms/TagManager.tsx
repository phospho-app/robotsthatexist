'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

interface TagManagerProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  disabled?: boolean
}

export function TagManager({ tags, onTagsChange, disabled = false }: TagManagerProps) {
  const [tagInput, setTagInput] = useState('')

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tags">Add Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            placeholder="Enter a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(tagInput)}
            disabled={!tagInput.trim() || disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Press Enter or comma to add a tag. Tags help users discover your robot.
        </p>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Current Tags:</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-2 py-1">
                #{tag}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                  onClick={() => removeTag(tag)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}