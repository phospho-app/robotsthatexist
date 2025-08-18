"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Download, Plus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import type { RobotFile, RobotFileListProps } from "@/lib/types";

// Optimized fetcher function for SWR - eliminates N+1 query problem
const fetchFiles = async (
  robotId: string,
  userId?: string
): Promise<RobotFile[]> => {
  try {
    // Single optimized query with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 10000)
    );

    const queryPromise = async () => {
      // First get files for this robot
      const filesResult = await supabase
        .from("robot_files")
        .select("*")
        .eq("robot_id", robotId)
        .order('created_at', { ascending: false });

      if (filesResult.error) {
        throw new Error(filesResult.error.message || "Failed to load files");
      }

      const filesData = filesResult.data || [];
      if (filesData.length === 0) {
        return [];
      }

      // Get ratings for these specific files
      const fileIds = filesData.map(f => f.id);
      const ratingsResult = await supabase
        .from("robot_file_ratings")
        .select("file_id, rating, user_id")
        .in('file_id', fileIds);

      if (ratingsResult.error) {
        console.error("Ratings error:", JSON.stringify(ratingsResult.error));
        throw new Error(ratingsResult.error.message || "Failed to load ratings");
      }

      const ratingsData = ratingsResult.data || [];

      // Build ratings lookup map for O(1) access
      const ratingsMap = new Map<string, { up: number; down: number; userRating: string | null }>();
      
      ratingsData.forEach(rating => {
        const fileId = rating.file_id;
        if (!ratingsMap.has(fileId)) {
          ratingsMap.set(fileId, { up: 0, down: 0, userRating: null });
        }
        const fileRatings = ratingsMap.get(fileId)!;
        
        if (rating.rating === 'up') fileRatings.up++;
        else if (rating.rating === 'down') fileRatings.down++;
        
        if (userId && rating.user_id === userId) {
          fileRatings.userRating = rating.rating;
        }
      });

      // Combine files with ratings efficiently
      const filesWithRatings = filesData.map(file => {
        const ratings = ratingsMap.get(file.id) || { up: 0, down: 0, userRating: null };
        const score = ratings.up - ratings.down;
        
        return {
          ...file,
          ratings: {
            up: ratings.up,
            down: ratings.down,
            userRating: ratings.userRating as "up" | "down" | null,
            score,
          },
        };
      });

      // Sort files: owner files first, then by rating score
      return filesWithRatings.sort((a, b) => {
        if (a.is_owner_added && !b.is_owner_added) return -1;
        if (!a.is_owner_added && b.is_owner_added) return 1;
        if (a.is_owner_added === b.is_owner_added) {
          return (b.ratings?.score || 0) - (a.ratings?.score || 0);
        }
        return 0;
      });
    };

    return await Promise.race([queryPromise(), timeoutPromise]) as RobotFile[];
  } catch (error) {
    console.error("Error fetching files:", error);
    throw error;
  }
};

export function RobotFileList({
  robotId,
  isOwner = false,
  className = "",
}: RobotFileListProps) {
  const { user, profile } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newFileDescription, setNewFileDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Function to infer filename from URL
  const inferFilenameFromUrl = (url: string): string => {
    if (!url.trim()) return "";

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop() || "";

      // If no extension found, return the last part of the path
      if (!filename.includes(".")) {
        return filename || "download";
      }

      return filename;
    } catch {
      // If URL is invalid, try to extract filename from the end of the string
      const parts = url.trim().split("/");
      const lastPart = parts[parts.length - 1];
      return lastPart || "download";
    }
  };

  const inferredFilename = inferFilenameFromUrl(newFileUrl);

  // SWR fetcher for robot files
  const filesKey = `robot-files-${robotId}-${user?.id || "anonymous"}`;
  const {
    data: files = [],
    error,
    isLoading,
  } = useSWR(filesKey, () => fetchFiles(robotId, user?.id), {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // Cache for 30 seconds
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    shouldRetryOnError: (error) => {
      // Retry on network errors and timeouts, not on auth errors
      return !error.message?.includes('auth') && !error.message?.includes('403');
    },
    onError: (error) => {
      console.error('Failed to load robot files:', error);
    }
  });

  const handleRating = async (fileId: string, rating: "up" | "down") => {
    if (!user) {
      toast.error("Please sign in to rate files");
      return;
    }

    try {
      const currentFile = files.find((f) => f.id === fileId);
      const currentRating = currentFile?.ratings?.userRating;

      // Optimistically update UI first
      mutate(
        filesKey,
        (currentFiles: RobotFile[] | undefined) => {
          if (!currentFiles) return currentFiles;

          return currentFiles.map((file) => {
            if (file.id !== fileId) return file;

            const ratings = file.ratings || {
              up: 0,
              down: 0,
              userRating: null,
              score: 0,
            };
            let newUp = ratings.up;
            let newDown = ratings.down;
            let newUserRating: "up" | "down" | null = null;

            if (currentRating === rating) {
              // Remove rating if clicking same button
              if (currentRating === "up") newUp = Math.max(0, newUp - 1);
              if (currentRating === "down") newDown = Math.max(0, newDown - 1);
              newUserRating = null;
            } else {
              // Add or change rating
              if (currentRating === "up") newUp = Math.max(0, newUp - 1);
              if (currentRating === "down") newDown = Math.max(0, newDown - 1);

              if (rating === "up") newUp += 1;
              if (rating === "down") newDown += 1;
              newUserRating = rating;
            }

            return {
              ...file,
              ratings: {
                ...ratings,
                up: newUp,
                down: newDown,
                userRating: newUserRating,
                score: newUp - newDown,
              },
            };
          });
        },
        false
      ); // Don't revalidate immediately

      // Update backend silently
      if (currentRating === rating) {
        // Remove rating if clicking same button
        const { error } = await supabase
          .from("robot_file_ratings")
          .delete()
          .eq("file_id", fileId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Add or update rating
        const { error } = await supabase.from("robot_file_ratings").upsert(
          {
            file_id: fileId,
            user_id: user.id,
            rating: rating,
          },
          {
            onConflict: "file_id,user_id",
          }
        );

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error rating:", error);
      toast.error("Failed to rate file");
      // Revert optimistic update on error
      mutate(filesKey);
    }
  };

  const handleAddFile = async () => {
    if (!user || !newFileUrl.trim()) {
      toast.error("Please enter a file URL");
      return;
    }

    const filename = inferFilenameFromUrl(newFileUrl);
    if (!filename) {
      toast.error("Could not determine filename from URL");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("robot_files").insert({
        robot_id: robotId,
        file_type: "urdf", // Default to URDF, could be made selectable
        file_url: newFileUrl.trim(),
        file_name: filename,
        version: "1.0.0", // Default version
        description: newFileDescription.trim() || null,
        user_id: user.id,
        is_owner_added: isOwner,
      });

      if (error) throw error;

      setNewFileUrl("");
      setNewFileDescription("");
      setShowAddForm(false);
      mutate(filesKey);
    } catch (error) {
      console.error("Error adding file:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("robot_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      mutate(filesKey);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const canDelete = (file: RobotFile) => {
    if (!user || !profile) return false;
    return profile.role === "admin" || file.user_id === user.id || isOwner;
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Failed to load files
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message?.includes('timeout') 
                ? 'The request timed out. Please try again.' 
                : 'There was an error loading the files.'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading files...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Files</CardTitle>
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add File
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth/login">
                <Plus className="h-4 w-4 mr-1" />
                Add File
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add Robot File</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Download URL"
                value={newFileUrl}
                onChange={(e) => setNewFileUrl(e.target.value)}
              />
              {newFileUrl.trim() && inferredFilename && (
                <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  Your file will be added with the name:{" "}
                  <span className="font-medium">{inferredFilename}</span>
                </div>
              )}
              <Input
                placeholder="Description (optional)"
                value={newFileDescription}
                onChange={(e) => setNewFileDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddFile}
                  disabled={
                    submitting || !newFileUrl.trim() || !inferredFilename
                  }
                  size="sm"
                >
                  {submitting ? "Adding..." : "Add File"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewFileUrl("");
                    setNewFileDescription("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No files available yet.</p>
            {user ? (
              <p className="text-sm mt-2">Be the first to add one!</p>
            ) : (
              <p className="text-sm mt-2">
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in
                </Link>{" "}
                to add files!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Owner files first */}
            {files
              .filter((f) => f.is_owner_added)
              .map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded bg-accent/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{file.file_name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        Owner
                      </Badge>
                    </div>
                    {file.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={file.file_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </a>
                    </Button>

                    <div className="flex items-center gap-1 text-xs">
                      <Button
                        variant={
                          file.ratings?.userRating === "up"
                            ? "default"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() => handleRating(file.id, "up")}
                        disabled={!user}
                        className="h-6 px-2"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {file.ratings?.up || 0}
                      </Button>
                      <Button
                        variant={
                          file.ratings?.userRating === "down"
                            ? "destructive"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() => handleRating(file.id, "down")}
                        disabled={!user}
                        className="h-6 px-2"
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        {file.ratings?.down || 0}
                      </Button>
                    </div>

                    {canDelete(file) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-destructive hover:text-destructive h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

            {/* Separator if there are both owner and community files */}
            {files.some((f) => f.is_owner_added) &&
              files.some((f) => !f.is_owner_added) && (
                <div className="border-t my-3">
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Community Contributions
                  </p>
                </div>
              )}

            {/* Community files */}
            {files
              .filter((f) => !f.is_owner_added)
              .map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{file.file_name}</h4>
                    {file.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={file.file_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </a>
                    </Button>

                    <div className="flex items-center gap-1 text-xs">
                      <Button
                        variant={
                          file.ratings?.userRating === "up"
                            ? "default"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() => handleRating(file.id, "up")}
                        disabled={!user}
                        className="h-6 px-2"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {file.ratings?.up || 0}
                      </Button>
                      <Button
                        variant={
                          file.ratings?.userRating === "down"
                            ? "destructive"
                            : "ghost"
                        }
                        size="sm"
                        onClick={() => handleRating(file.id, "down")}
                        disabled={!user}
                        className="h-6 px-2"
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        {file.ratings?.down || 0}
                      </Button>
                    </div>

                    {canDelete(file) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-destructive hover:text-destructive h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
