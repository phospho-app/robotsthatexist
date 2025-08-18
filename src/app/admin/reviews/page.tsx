"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Search,
  Calendar,
  Star,
  Eye,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { AdminReview } from "@/lib/types";

const reviewsFetcher = async (key: string) => {
  const [, searchQuery, ratingFilter, sortBy] = key.split("|");

  let query = supabase.from("reviews").select(`
      *,
      robots (
        name,
        slug
      )
    `);

  // Apply search filter
  if (searchQuery) {
    query = query.or(`comment.ilike.%${searchQuery}%`);
  }

  // Apply rating filter
  if (ratingFilter && ratingFilter !== "all") {
    query = query.eq("rating", parseInt(ratingFilter));
  }

  // Apply sorting
  switch (sortBy) {
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    case "created":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  const reviews = data || [];

  // For non-anonymous reviews, fetch profile data separately
  const nonAnonymousUserIds = reviews
    .filter((review) => !review.is_anonymous)
    .map((review) => review.user_id);

  let profilesData: any[] = [];
  if (nonAnonymousUserIds.length > 0) {
    const profilesResult = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, github_username")
      .in("id", nonAnonymousUserIds);

    profilesData = profilesResult.data || [];
  }

  // Attach profile data only to non-anonymous reviews
  const reviewsWithProfiles = reviews.map((review) => ({
    ...review,
    profiles: review.is_anonymous
      ? null
      : profilesData.find((profile) => profile.id === review.user_id),
  }));

  return reviewsWithProfiles;
};

export default function AdminReviewsPage() {
  const { user, profile, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Redirect if not admin
  if (!loading && (!user || profile?.role !== "admin")) {
    redirect("/");
  }

  const {
    data: reviews = [],
    error,
    isLoading,
    mutate: mutateReviews,
  } = useSWR(
    `admin-reviews|${searchQuery}|${ratingFilter}|${sortBy}`,
    reviewsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const handleDeleteReview = async (reviewId: string, robotName: string) => {
    setIsDeleting(reviewId);

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      // Revalidate the reviews list
      await mutateReviews();

      // Show success message
      alert(`Review for "${robotName}" has been deleted successfully.`);
    } catch (error: any) {
      console.error("Error deleting review:", error);
      alert(`Failed to delete review: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Failed to Load Reviews</h2>
          <p className="text-muted-foreground mb-6">
            {error.message || "Something went wrong while fetching reviews."}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Manage Reviews
          </h1>
          <p className="text-muted-foreground mt-2">
            Moderate reviews and handle user feedback
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews by content..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Rating Filter */}
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading..."
            : `${reviews.length} review${
                reviews.length === 1 ? "" : "s"
              } found`}
        </p>
      </div>

      {/* Reviews Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Review</TableHead>
              <TableHead>Robot</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-20"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-8 bg-gray-200 rounded w-24 ml-auto"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="max-w-md">
                    <div className="space-y-2">
                      <div className="text-sm war-story-markdown line-clamp-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {review.comment}
                        </ReactMarkdown>
                      </div>
                      {review.updated_at !== review.created_at && (
                        <Badge variant="outline" className="text-xs">
                          Edited
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/robots/${review.robots?.slug}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {review.robots?.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            review.is_anonymous
                              ? ""
                              : review.profiles?.avatar_url || ""
                          }
                        />
                        <AvatarFallback className="text-xs">
                          {review.is_anonymous
                            ? "A"
                            : review.profiles?.full_name?.charAt(0) ||
                              review.profiles?.username?.charAt(0) ||
                              "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {review.is_anonymous ? (
                            "Anonymous User"
                          ) : review.profiles?.github_username ? (
                            <a
                              href={`https://github.com/${review.profiles.github_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
                            >
                              {review.profiles?.full_name ||
                                review.profiles?.username ||
                                review.profiles.github_username}
                            </a>
                          ) : (
                            review.profiles?.full_name ||
                            review.profiles?.username ||
                            "User"
                          )}
                        </div>
                        {!review.is_anonymous &&
                          review.profiles?.github_username && (
                            <div className="text-xs text-muted-foreground truncate">
                              @{review.profiles.github_username}
                            </div>
                          )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium">
                        {review.rating}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="ghost" asChild>
                        <Link
                          href={`/robots/${review.robots?.slug}?tab=reviews`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting === review.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Review</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this review for "
                              {review.robots?.name}"? This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteReview(
                                  review.id,
                                  review.robots?.name || "Unknown Robot"
                                )
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No stories found
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery || ratingFilter !== "all"
                        ? "Try adjusting your filters to see more results."
                        : "No stories have been submitted yet."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
