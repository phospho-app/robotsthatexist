'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { RobotFormData, SocialLink, getInitialFormData, validateRobotForm } from '@/lib/robotFormUtils'

interface Robot {
  id?: string
  name: string
  description: string
  github_url?: string | null
  image_url?: string | null
  status: 'draft' | 'published'
  tags?: string[]
}

interface RobotFormState {
  formData: RobotFormData
  tags: string[]
  socialLinks: SocialLink[]
  isDirty: boolean
  lastSaved?: string
}

// Fetcher for robot with social links - only fetches social links created by the robot creator
const robotWithDataFetcher = async (robotId: string) => {
  // First get the robot to know who the creator is
  const robotResult = await supabase
    .from('robots')
    .select('*')
    .eq('id', robotId)
    .single()

  if (robotResult.error) {
    throw new Error(`Failed to fetch robot: ${robotResult.error.message}`)
  }

  // Then get only social links created by the robot creator (or with null user_id for legacy links)
  const socialLinksResult = await supabase
    .from('robot_social_links')
    .select('*')
    .eq('robot_id', robotId)
    .or(`user_id.eq.${robotResult.data.creator_id},user_id.is.null`)
    .order('created_at', { ascending: false })

  return {
    robot: robotResult.data,
    socialLinks: (socialLinksResult.data || []).map((link: any) => ({
      url: link.url,
      title: link.title || '',
      platform: link.platform
    }))
  }
}

interface UseRobotFormOptions {
  robotId?: string // For edit mode
  mode: 'create' | 'edit'
}

export function useRobotForm({ robotId, mode }: UseRobotFormOptions) {
  // Create a unique cache key for the form state
  const formCacheKey = robotId ? `robot-form-${robotId}` : 'robot-form-new'
  
  // Fetch robot data for edit mode
  const { 
    data: robotData, 
    error: robotError, 
    isLoading: robotLoading,
    mutate: mutateRobot
  } = useSWR(
    mode === 'edit' && robotId ? `robot-with-data-${robotId}` : null,
    () => robotWithDataFetcher(robotId!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000
    }
  )

  // Use SWR for form state management
  const shouldFetch = mode === 'create' || (mode === 'edit' && robotData)
  const formStateKey = shouldFetch ? formCacheKey : null
  
  const { 
    data: formState, 
    mutate: mutateFormState,
    isLoading: formLoading 
  } = useSWR<RobotFormState>(
    formStateKey,
    () => {
      // Initialize form state based on mode
      if (mode === 'edit' && robotData) {
        const { robot, socialLinks } = robotData
        return {
          formData: {
            name: robot.name || '',
            description: robot.description || '',
            github_url: robot.github_url || '',
            image_url: robot.image_url || '',
            budget: robot.budget || '',
            status: 'published'
          },
          tags: robot.tags || [],
          socialLinks: socialLinks || [],
          isDirty: false,
          lastSaved: new Date().toISOString()
        }
      } else {
        // Create mode
        return {
          formData: getInitialFormData(),
          tags: [],
          socialLinks: [],
          isDirty: false
        }
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnMount: true
    }
  )

  // Computed values
  const isReady = useMemo(() => {
    if (mode === 'create') {
      return formState !== undefined && formState !== null
    } else {
      return robotData !== undefined && formState !== undefined && formState !== null
    }
  }, [mode, robotData, formState])

  const currentFormData = formState?.formData || getInitialFormData()
  const currentTags = formState?.tags || []
  const currentSocialLinks = formState?.socialLinks || []

  // Update functions with optimistic updates
  const updateFormData = useCallback((newFormData: RobotFormData) => {
    mutateFormState((current) => ({
      ...current!,
      formData: newFormData,
      isDirty: true
    }), false)
  }, [mutateFormState])

  const updateTags = useCallback((newTags: string[]) => {
    mutateFormState((current) => ({
      ...current!,
      tags: newTags,
      isDirty: true
    }), false)
  }, [mutateFormState])

  const updateSocialLinks = useCallback((newSocialLinks: SocialLink[]) => {
    mutateFormState((current) => ({
      ...current!,
      socialLinks: newSocialLinks,
      isDirty: true
    }), false)
  }, [mutateFormState])

  // Validation
  const validate = useCallback(() => {
    return validateRobotForm(currentFormData)
  }, [currentFormData])

  const getFormErrors = useCallback(() => {
    return validate().errors
  }, [validate])

  const isValid = useCallback(() => {
    return validate().isValid
  }, [validate])

  // Reset form
  const reset = useCallback(() => {
    if (mode === 'edit' && robotData) {
      const { robot, socialLinks } = robotData
      mutateFormState({
        formData: {
          name: robot.name || '',
          description: robot.description || '',
          github_url: robot.github_url || '',
          image_url: robot.image_url || '',
          budget: robot.budget || '',
          status: 'published'
        },
        tags: robot.tags || [],
        socialLinks: socialLinks || [],
        isDirty: false,
        lastSaved: new Date().toISOString()
      }, false)
    } else {
      mutateFormState({
        formData: getInitialFormData(),
        tags: [],
        socialLinks: [],
        isDirty: false
      }, false)
    }
  }, [mode, robotData, mutateFormState])

  return {
    // State
    formData: currentFormData,
    tags: currentTags,
    socialLinks: currentSocialLinks,
    
    // Loading states
    isReady,
    isLoading: robotLoading || formLoading,
    robotError,
    
    // State info
    isDirty: formState?.isDirty || false,
    lastSaved: formState?.lastSaved,

    // Update functions
    setFormData: updateFormData,
    setTags: updateTags,
    setSocialLinks: updateSocialLinks,

    // Validation
    validate,
    getFormErrors,
    isValid,

    // Utilities
    reset,
    mutateFormState,
    mutateRobot,
    
    // Raw data for advanced use cases
    robotData
  }
}