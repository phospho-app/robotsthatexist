"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { RobotForm } from "@/components/forms/RobotForm";
import { useRobotForm } from "@/hooks/useRobotForm";
import { generateSlug } from "@/lib/robotFormUtils";
import { mutate } from "swr";

export default function CreateRobotClient() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    isDirty,
    mutateFormState,
  } = useRobotForm({ mode: "create" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      alert("You must be signed in to create a robot.");
      return;
    }

    if (!isValid()) {
      const errors = getFormErrors();
      alert(errors.join("\n"));
      return;
    }

    setIsSubmitting(true);

    try {
      const slug = generateSlug(formData.name);

      // Check if slug already exists
      const { data: existingRobot } = await supabase
        .from("robots")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existingRobot) {
        alert(
          "A robot with this name already exists. Please choose a different name."
        );
        setIsSubmitting(false);
        return;
      }

      const { data: robotData, error } = await supabase
        .from("robots")
        .insert({
          name: formData.name.trim(),
          slug,
          description: formData.description.trim(),
          github_url: formData.github_url.trim(),
          image_url: formData.image_url.trim() || null,
          budget: formData.budget.trim(),
          tags,
          creator_id: user.id,
          status: formData.status,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add social links if any
      if (socialLinks.length > 0) {
        const socialLinkInserts = socialLinks.map((link) => ({
          robot_id: robotData.id,
          url: link.url,
          title: link.title || null,
          platform: link.platform || null,
          user_id: user?.id, // Mark as created by the robot creator
        }));

        const { error: socialLinksError } = await supabase
          .from("robot_social_links")
          .insert(socialLinkInserts);

        if (socialLinksError) {
          console.error("Error creating social links:", socialLinksError);
          // Don't fail the entire operation if social links fail
        }
      }

      console.log("✅ Robot created successfully:", {
        slug,
        name: formData.name,
        status: formData.status,
      });

      // Invalidate robots list cache to show new robot in browse page
      mutate("all-robots");

      // Clear form state since we're navigating away
      mutateFormState(
        {
          formData: {
            name: "",
            description: "",
            github_url: "",
            image_url: "",
            budget: "",
            status: "draft",
          },
          tags: [],
          socialLinks: [],
          isDirty: false,
        },
        false
      );

      router.push(`/robots/${slug}`);
    } catch (error: any) {
      console.error("Error creating robot:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to create a robot.
            </p>
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Robot</h1>
          <p className="text-muted-foreground">
            Add a new robot to the catalog with complete information including
            budget, social links and community resources.
          </p>
        </div>

        {isReady ? (
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
                <Link href="/">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={!isValid() || isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Robot
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">
              Initializing form...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
