"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, ExternalLink } from "lucide-react";
import { getPlatformDisplayName } from "@/lib/platform-utils";
import {
  SocialLink,
  validateSocialLink,
  createSocialLink,
} from "@/lib/robotFormUtils";

interface SocialLinksManagerProps {
  socialLinks: SocialLink[];
  onSocialLinksChange: (links: SocialLink[]) => void;
  disabled?: boolean;
}

export function SocialLinksManager({
  socialLinks,
  onSocialLinksChange,
  disabled = false,
}: SocialLinksManagerProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isDocumentation, setIsDocumentation] = useState(false);

  const addSocialLink = () => {
    if (validateSocialLink(linkUrl)) {
      const newLink = createSocialLink(linkUrl, linkTitle, isDocumentation);
      onSocialLinksChange([...socialLinks, newLink]);
      setLinkUrl("");
      setLinkTitle("");
      setIsDocumentation(false);
    }
  };

  const removeSocialLink = (indexToRemove: number) => {
    onSocialLinksChange(
      socialLinks.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSocialLink();
    }
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://youtube.com/watch?v=..."
            type="url"
            className="flex-1"
            disabled={disabled}
          />
          <Input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Link title (optional)"
            className="flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            onClick={addSocialLink}
            size="sm"
            disabled={!validateSocialLink(linkUrl) || disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Documentation Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="documentation"
            checked={isDocumentation}
            onCheckedChange={(checked: boolean) =>
              setIsDocumentation(checked as boolean)
            }
            disabled={disabled}
          />
          <label
            htmlFor="documentation"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Mark as a documentation link
          </label>
        </div>
      </div>
      <div className="space-y-2">
        {socialLinks.map((link, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium capitalize text-primary">
                  {getPlatformDisplayName((link.platform as any) || "website")}
                </span>
                {link.title && (
                  <span className="text-xs text-muted-foreground">
                    • {link.title}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {link.url}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeSocialLink(index)}
              className="p-1 hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
