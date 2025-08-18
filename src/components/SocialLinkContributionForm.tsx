"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SocialLinksManager } from "@/components/forms/SocialLinksManager";
import { SocialLink } from "@/lib/robotFormUtils";
import { mutate } from "swr";

interface SocialLinkContributionFormProps {
  robotId: string;
  robotSlug: string;
  onSubmitted?: () => void;
}

export function SocialLinkContributionForm({ 
  robotId,
  robotSlug,
  onSubmitted 
}: SocialLinkContributionFormProps) {
  const { user } = useAuth();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please sign in to contribute social links.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (socialLinks.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert all social links with user_id for community contributions
      const socialLinkInserts = socialLinks.map(link => ({
        robot_id: robotId,
        platform: link.platform,
        url: link.url,
        title: link.title || null,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("robot_social_links")
        .insert(socialLinkInserts);

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      // Revalidate social links data using the correct cache key (slug-based)
      await mutate(`robot-with-data-${robotSlug}`);

      onSubmitted?.();

      // Reset form
      setSocialLinks([]);
    } catch (error: any) {
      console.error("Error adding social links:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Social & Community Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SocialLinksManager
          socialLinks={socialLinks}
          onSocialLinksChange={setSocialLinks}
          disabled={isSubmitting}
        />
        
        {socialLinks.length > 0 && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting 
              ? "Adding Links..." 
              : `Add ${socialLinks.length} Link${socialLinks.length !== 1 ? 's' : ''}`
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}