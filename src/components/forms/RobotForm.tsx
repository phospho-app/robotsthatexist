'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagManager } from './TagManager'
import { SocialLinksManager } from './SocialLinksManager'
import { BudgetSelector } from '@/components/ui/budget-selector'
import { RobotFormData, SocialLink, generateSlug } from '@/lib/robotFormUtils'

interface RobotFormProps {
  formData: RobotFormData
  tags: string[]
  socialLinks: SocialLink[]
  onFormDataChange: (data: RobotFormData) => void
  onTagsChange: (tags: string[]) => void
  onSocialLinksChange: (links: SocialLink[]) => void
  disabled?: boolean
}

export function RobotForm({
  formData,
  tags,
  socialLinks,
  onFormDataChange,
  onTagsChange,
  onSocialLinksChange,
  disabled = false
}: RobotFormProps) {
  const updateFormData = (field: keyof RobotFormData, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">
              Robot Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter robot name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              required
              disabled={disabled}
            />
            {formData.name && (
              <p className="text-xs text-muted-foreground mt-1">
                Slug: {generateSlug(formData.name)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Enter robot description"
              rows={4}
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              required
              disabled={disabled}
            />
          </div>

          <div>
            <Label htmlFor="github_url">
              GitHub Repository URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="github_url"
              type="url"
              placeholder="https://github.com/username/repository"
              value={formData.github_url}
              onChange={(e) => updateFormData('github_url', e.target.value)}
              required
              disabled={disabled}
            />
          </div>

          <div>
            <Label htmlFor="budget">
              Budget <span className="text-destructive">*</span>
            </Label>
            <BudgetSelector
              value={formData.budget}
              onValueChange={(value) => updateFormData('budget', value)}
              placeholder="Select budget range"
              required={true}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Select the approximate cost range to build this robot
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <TagManager
            tags={tags}
            onTagsChange={onTagsChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social & Community Links</CardTitle>
        </CardHeader>
        <CardContent>
          <SocialLinksManager
            socialLinks={socialLinks}
            onSocialLinksChange={onSocialLinksChange}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  )
}