"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { redirect, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Plus, X, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateRobotPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    github_url: "",
    image_url: "",
    status: "draft" as "draft" | "published",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not admin
  if (!loading && (!user || profile?.role !== "admin")) {
    redirect("/");
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields.");
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

      // Create the robot
      const { data, error } = await supabase
        .from("robots")
        .insert({
          name: formData.name.trim(),
          slug,
          description: formData.description.trim(),
          github_url: formData.github_url.trim() || null,
          image_url: formData.image_url.trim() || null,
          creator_id: user!.id,
          status: formData.status,
          tags,
        })
        .select()
        .single();

      if (error) throw error;

      // Success - redirect to robot page
      router.push(`/admin/robots`);
    } catch (error: any) {
      console.error("Error creating robot:", error);
      alert(`Failed to create robot: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/robots">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Robots
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Create New Robot
          </h1>
          <p className="text-muted-foreground mt-2">
            Add a new robot to the catalog
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  Robot Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter robot name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                {formData.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Slug: {generateSlug(formData.name)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as "draft" | "published",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Links and Media */}
        <Card>
          <CardHeader>
            <CardTitle>Links and Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="github_url">GitHub Repository URL</Label>
              <Input
                id="github_url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={formData.github_url}
                onChange={(e) =>
                  setFormData({ ...formData, github_url: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional. If provided, README will be automatically fetched and
                displayed.
              </p>
            </div>

            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                placeholder="https://example.com/robot-image.jpg"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional. URL to a representative image of the robot.
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="tags">Add Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Enter a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter or comma to add a tag. Tags help users discover
                  your robot.
                </p>
              </div>

              {tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Current Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-2 py-1"
                      >
                        #{tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                          onClick={() => removeTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/robots">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              "Creating..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Add Robot
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
