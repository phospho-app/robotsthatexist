"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import { mutate } from "swr";
import type { ReviewFormProps } from "@/lib/types";

export function ReviewForm({
  robotId,
  onReviewSubmitted,
  existingReview,
}: ReviewFormProps) {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
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
            Please sign in to share a war story.
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

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from("reviews")
          .update({
            rating,
            comment: comment.trim(),
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
          is_anonymous: isAnonymous,
        });

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
      }

      // Revalidate reviews data
      try {
        await mutate(`reviews-${robotId}`);
      } catch (mutateError) {
        console.error("SWR mutate error:", mutateError);
        // Don't throw here, the review was saved successfully
      }

      onReviewSubmitted?.();

      // Reset form if creating new review
      if (!existingReview) {
        setRating(0);
        setComment("");
        setIsAnonymous(false);
      }
    } catch (error: any) {
      console.error("Error submitting story:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingReview ? "Update Your War Story" : "Write a War Story"}
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
                ? "Update War Story"
                : "Submit War Story"}
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
