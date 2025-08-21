'use client'

import { useCallback, useMemo, useEffect } from 'react'
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

// Local storage keys
const ROBOT_FORM_STORAGE_KEY = 'robot-form-draft'

// Local storage utilities
const saveFormToLocalStorage = (formState: RobotFormState) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ROBOT_FORM_STORAGE_KEY, JSON.stringify(formState))
    } catch (error) {
      console.error('Failed to save form to localStorage:', error)
    }
  }
}

const loadFormFromLocalStorage = (): RobotFormState | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(ROBOT_FORM_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load form from localStorage:', error)
    }
  }
  return null
}

const clearFormFromLocalStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(ROBOT_FORM_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear form from localStorage:', error)
    }
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
        // Create mode - try to load from localStorage first
        const storedFormState = loadFormFromLocalStorage()
        if (storedFormState) {
          return {
            ...storedFormState,
            isDirty: true // Mark as dirty since it's loaded from storage
          }
        }
        
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

  // Update functions with optimistic updates and localStorage sync
  const updateFormData = useCallback((newFormData: RobotFormData) => {
    const updatedState = {
      formData: newFormData,
      tags: currentTags,
      socialLinks: currentSocialLinks,
      isDirty: true
    }
    
    mutateFormState((current) => ({
      ...current!,
      ...updatedState
    }), false)
    
    // Save to localStorage for create mode
    if (mode === 'create') {
      saveFormToLocalStorage(updatedState)
    }
  }, [mutateFormState, currentTags, currentSocialLinks, mode])

  const updateTags = useCallback((newTags: string[]) => {
    const updatedState = {
      formData: currentFormData,
      tags: newTags,
      socialLinks: currentSocialLinks,
      isDirty: true
    }
    
    mutateFormState((current) => ({
      ...current!,
      ...updatedState
    }), false)
    
    // Save to localStorage for create mode
    if (mode === 'create') {
      saveFormToLocalStorage(updatedState)
    }
  }, [mutateFormState, currentFormData, currentSocialLinks, mode])

  const updateSocialLinks = useCallback((newSocialLinks: SocialLink[]) => {
    const updatedState = {
      formData: currentFormData,
      tags: currentTags,
      socialLinks: newSocialLinks,
      isDirty: true
    }
    
    mutateFormState((current) => ({
      ...current!,
      ...updatedState
    }), false)
    
    // Save to localStorage for create mode
    if (mode === 'create') {
      saveFormToLocalStorage(updatedState)
    }
  }, [mutateFormState, currentFormData, currentTags, mode])

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
      const resetState = {
        formData: getInitialFormData(),
        tags: [],
        socialLinks: [],
        isDirty: false
      }
      mutateFormState(resetState, false)
      
      // Clear localStorage for create mode
      if (mode === 'create') {
        clearFormFromLocalStorage()
      }
    }
  }, [mode, robotData, mutateFormState])

  // Function to clear form draft from localStorage
  const clearFormDraft = useCallback(() => {
    if (mode === 'create') {
      clearFormFromLocalStorage()
      const resetState = {
        formData: getInitialFormData(),
        tags: [],
        socialLinks: [],
        isDirty: false
      }
      mutateFormState(resetState, false)
    }
  }, [mode, mutateFormState])

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
    clearFormDraft,
    mutateFormState,
    mutateRobot,
    
    // Raw data for advanced use cases
    robotData
  }
}