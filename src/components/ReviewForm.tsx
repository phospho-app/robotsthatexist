"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BudgetSelector } from "@/components/ui/budget-selector";
import { Star } from "lucide-react";
import { mutate } from "swr";
import type { ReviewFormProps } from "@/lib/types";

export function ReviewForm({
  robotId,
  onReviewSubmitted,
  mutateKey,
  existingReview,
}: ReviewFormProps) {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [budget, setBudget] = useState(existingReview?.budget || "");
  const [isAnonymous, setIsAnonymous] = useState(
    existingReview?.is_anonymous || false
  );
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || !profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please sign in to share a story.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0 || !comment.trim()) {
      return;
    }

    setIsSubmitting(true);

    // Optimistic update for new reviews
    if (!existingReview && mutateKey) {
      try {
        // Create optimistic review object
        const optimisticReview = {
          id: `optimistic-${Date.now()}`,
          robot_id: robotId,
          user_id: user.id,
          rating,
          comment: comment.trim(),
          budget: budget.trim() || null,
          is_anonymous: isAnonymous,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profiles: isAnonymous ? null : {
            id: user.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            github_username: profile.github_username
          }
        };

        // Update the cache optimistically
        mutate(mutateKey, (currentData: any) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            reviews: [optimisticReview, ...(currentData.reviews || [])]
          };
        }, false);
      } catch (optimisticError) {
        console.error("Optimistic update error:", optimisticError);
        // Continue with the API call even if optimistic update fails
      }
    }

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("reviews")
          .update({
            rating,
            comment: comment.trim(),
            budget: budget.trim() || null,
            is_anonymous: isAnonymous,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReview.id);

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }
      } else {
        // Create new review
        const { error } = await supabase.from("reviews").insert({
          robot_id: robotId,
          user_id: user.id,
          rating,
          comment: comment.trim(),
          budget: budget.trim() || null,
          is_anonymous: isAnonymous,
        });

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
      }

      // Revalidate reviews data to get the real review from the server
      try {
        if (mutateKey) {
          // Force revalidation to replace optimistic data with real data
          await mutate(mutateKey);
        } else {
          await mutate(`reviews-${robotId}`);
        }
      } catch (mutateError) {
        console.error("SWR mutate error:", mutateError);
        // Don't throw here, the review was saved successfully
      }

      onReviewSubmitted?.();

      // Reset form if creating new review
      if (!existingReview) {
        setRating(0);
        setComment("");
        setBudget("");
        setIsAnonymous(false);
      }
    } catch (error: any) {
      console.error("Error submitting story:", error);
      
      // Revert optimistic update on error
      if (!existingReview && mutateKey) {
        try {
          await mutate(mutateKey);
        } catch (revertError) {
          console.error("Error reverting optimistic update:", revertError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingReview ? "Update Your story" : "Write a story"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Rating <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-yellow-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 && (
                  <>
                    {rating} star{rating !== 1 ? "s" : ""}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium mb-2">
              Comment <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this robot..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              required
            />
            <div className="text-xs text-muted-foreground mt-1">
              {comment.length}/1000 characters
            </div>
          </div>

          {/* Budget */}
          <div>
            <Label htmlFor="budget" className="block text-sm font-medium mb-2">
              Budget (Optional)
            </Label>
            <BudgetSelector
              value={budget}
              onValueChange={setBudget}
              placeholder="Select budget range"
              required={false}
            />
            <div className="text-xs text-muted-foreground mt-1">
              Share how much you spent building this robot
            </div>
          </div>

          {/* Anonymous Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked: boolean) =>
                setIsAnonymous(checked as boolean)
              }
            />
            <label
              htmlFor="anonymous"
              className="text-sm font-xmedium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Post anonymously
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={rating === 0 || !comment.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting
                ? existingReview
                  ? "Updating..."
                  : "Submitting..."
                : existingReview
                ? "Update story"
                : "Submit story"}
            </Button>
            {existingReview && onReviewSubmitted && (
              <Button
                type="button"
                variant="outline"
                onClick={onReviewSubmitted}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
