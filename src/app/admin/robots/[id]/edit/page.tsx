'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { redirect, useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Bot, ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { RobotForm } from '@/components/forms/RobotForm'
import { useRobotForm } from '@/hooks/useRobotForm'
import { generateSlug } from '@/lib/robotFormUtils'
import { mutate } from 'swr'

export default function EditRobotPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const robotId = params?.id as string
  const returnTo = searchParams.get('returnTo') || '/admin/robots'
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if not admin or creator (check will be refined after robot loads)
  if (!loading && !user) {
    redirect('/')
  }

  // Use SWR-based form logic
  const {
    formData,
    tags,
    socialLinks,
    setFormData,
    setTags,
    setSocialLinks,
    isValid,
    getFormErrors,
    isReady,
    isLoading,
    robotError,
    isDirty,
    mutateFormState,
    mutateRobot,
    robotData
  } = useRobotForm({ 
    robotId,
    mode: 'edit'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 Submit clicked - Form data:', {
      formData,
      tags,
      socialLinksCount: socialLinks.length,
      isReady
    })

    if (!isValid()) {
      const errors = getFormErrors()
      console.error('❌ Validation failed:', errors)
      alert(errors.join('\n'))
      return
    }

    setIsSubmitting(true)
    console.log('⏳ Starting update process...')

    try {
      const newSlug = generateSlug(formData.name)
      console.log('📝 Generated slug:', newSlug)
      
      // Check if slug already exists (excluding current robot)
      const { data: existingRobot, error: slugCheckError } = await supabase
        .from('robots')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', robotId)
        .single()

      if (slugCheckError && slugCheckError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is what we want
        throw slugCheckError
      }

      if (existingRobot) {
        console.warn('⚠️ Slug conflict:', newSlug)
        alert('A robot with this name already exists. Please choose a different name.')
        setIsSubmitting(false)
        return
      }

      // Update the robot
      const { error } = await supabase
        .from('robots')
        .update({
          name: formData.name.trim(),
          slug: newSlug,
          description: formData.description.trim(),
          github_url: formData.github_url.trim() || null,
          image_url: formData.image_url.trim() || null,
          budget: formData.budget.trim(),
          status: formData.status,
          tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', robotId)

      if (error) throw error

      // Update social links - only delete and recreate creator's social links, preserve community contributions
      // Delete only social links created by the robot creator (or legacy ones with null user_id)
      const { error: deleteError } = await supabase
        .from('robot_social_links')
        .delete()
        .eq('robot_id', robotId)
        .or(`user_id.eq.${user?.id},user_id.is.null`)

      if (deleteError) {
        console.error('Error deleting existing creator social links:', deleteError)
      }

      // Add new social links if any - mark them as created by the robot creator
      if (socialLinks.length > 0) {
        const socialLinkInserts = socialLinks.map(link => ({
          robot_id: robotId,
          url: link.url,
          title: link.title || null,
          platform: link.platform || null,
          user_id: user?.id, // Mark as created by the robot creator
        }))

        const { error: socialLinksError } = await supabase
          .from('robot_social_links')
          .insert(socialLinkInserts)

        if (socialLinksError) {
          console.error('Error updating social links:', socialLinksError)
          // Don't fail the entire operation if social links fail
        }
      }

      console.log('✅ Robot updated successfully:', {
        robotId,
        name: formData.name,
        status: formData.status
      })

      // Update SWR caches with new data
      const updatedRobot = {
        ...robotData?.robot,
        name: formData.name.trim(),
        slug: newSlug,
        description: formData.description.trim(),
        github_url: formData.github_url.trim() || null,
        image_url: formData.image_url.trim() || null,
        budget: formData.budget.trim(),
        status: formData.status,
        tags,
        updated_at: new Date().toISOString()
      }

      // Update form state to mark as clean
      mutateFormState((current) => ({
        ...current!,
        isDirty: false,
        lastSaved: new Date().toISOString()
      }), false)

      // Update robot cache
      mutateRobot({
        robot: updatedRobot,
        socialLinks: socialLinks.map(link => ({
          url: link.url,
          title: link.title,
          platform: link.platform || null
        }))
      }, false)

      // Also invalidate robot detail page cache if slug changed
      if (robotData?.robot.slug !== newSlug) {
        // Invalidate old slug cache
        await mutate(`robot-with-data-${robotData?.robot.slug}`, undefined, false)
        // Invalidate new slug cache  
        await mutate(`robot-with-data-${newSlug}`, undefined, false)
      } else {
        // Invalidate current slug cache
        await mutate(`robot-with-data-${newSlug}`, undefined, false)
      }

      // Invalidate robots list cache to update the browse page
      await mutate('all-robots', undefined, false)

      // Success - redirect based on returnTo parameter
      if (returnTo.startsWith('/robots/')) {
        // If coming from robot page, always redirect to the current slug
        // This handles cases where the slug might have changed
        router.push(`/robots/${newSlug}`)
      } else {
        router.push(returnTo)
      }
      
    } catch (error: any) {
      console.error('Error updating robot:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading robot data...</span>
        </div>
      </div>
    )
  }

  if (robotError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Failed to Load Robot</h2>
          <p className="text-muted-foreground mb-6">
            {robotError.message || 'Something went wrong while fetching robot data.'}
          </p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/robots">Back to Robots</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Robot Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The robot you're trying to edit doesn't exist or failed to load.
          </p>
          <Button asChild>
            <Link href={returnTo}>
              {returnTo.startsWith('/robots/') ? 'Back to Robot' : 'Back to Robots'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Check if user has permission to edit this robot
  const canEdit = user && robotData?.robot && (
    profile?.role === 'admin' || robotData.robot.creator_id === user.id
  )

  if (!canEdit) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You don't have permission to edit this robot. Only admins and the robot creator can edit robots.
          </p>
          <Button asChild>
            <Link href={returnTo}>
              {returnTo.startsWith('/robots/') ? 'Back to Robot' : 'Back to Home'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href={returnTo}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {returnTo.startsWith('/robots/') ? 'Back to Robot' : 'Back to Robots'}
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Edit Robot
          </h1>
          <p className="text-muted-foreground mt-2">
            Update robot information and settings
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <RobotForm
          formData={formData}
          tags={tags}
          socialLinks={socialLinks}
          onFormDataChange={setFormData}
          onTagsChange={setTags}
          onSocialLinksChange={setSocialLinks}
          disabled={isSubmitting}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href={returnTo}>
              Cancel
            </Link>
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Robot {isDirty && "*"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}