import { detectPlatformFromUrl, isValidUrl } from './platform-utils'
import { isValidBudgetRange } from './budget-config'

export interface RobotFormData {
  name: string
  description: string
  github_url: string
  image_url: string
  budget: string
  status: 'draft' | 'published'
}

export interface SocialLink {
  url: string
  title: string
  platform?: string
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateRobotForm(formData: RobotFormData): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!formData.name.trim()) {
    errors.push('Robot name is required')
  }

  if (!formData.description.trim()) {
    errors.push('Description is required')
  }

  if (!formData.budget.trim()) {
    errors.push('Budget is required')
  } else if (!isValidBudgetRange(formData.budget)) {
    errors.push('Please select a valid budget range')
  }

  if (!formData.status || (formData.status !== 'draft' && formData.status !== 'published')) {
    errors.push('Please select a valid status (Published)')
  }

  if (!formData.github_url.trim()) {
    errors.push('GitHub repository URL is required')
  } else if (!isValidUrl(formData.github_url)) {
    errors.push('GitHub URL must be a valid URL')
  }


  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateSocialLink(url: string): boolean {
  return url.trim() !== '' && isValidUrl(url.trim())
}

export function createSocialLink(url: string, title: string, isDocumentation?: boolean): SocialLink {
  const trimmedUrl = url.trim()
  const trimmedTitle = title.trim()
  const platform = detectPlatformFromUrl(trimmedUrl, isDocumentation ? 'documentation' : undefined)
  
  return {
    url: trimmedUrl,
    title: trimmedTitle,
    platform
  }
}

export function getInitialFormData(): RobotFormData {
  return {
    name: '',
    description: '',
    github_url: '',
    image_url: '',
    budget: '',
    status: 'published'
  }
}