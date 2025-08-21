"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/ui/link";
import { useAllRobots, useAllTags } from "@/lib/robot-data";
import { comprehensiveSearch } from "@/lib/client-search-utils";
import { RobotGrid } from "@/components/RobotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type { RobotCardData } from "@/lib/types";


function RobotsContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Get all robots and tags using SWR
  const { data: allRobots = [], error, isLoading } = useAllRobots();
  const { data: allTags = [] } = useAllTags();

  // Update state from URL parameters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "all";
    
    setSearchQuery(search);
    setSelectedTag(tag);
  }, [searchParams]);

  // Perform client-side search, filtering, and sorting
  const robots = comprehensiveSearch(allRobots, searchQuery, {
    tag: selectedTag,
    sortBy: 'rating',
    limit: 1000
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // Update URL without triggering navigation
    const newUrl = new URL(window.location.href);
    if (value) {
      newUrl.searchParams.set("search", value);
    } else {
      newUrl.searchParams.delete("search");
    }
    window.history.replaceState({}, "", newUrl.toString());
  };


  const handleTagChange = (value: string) => {
    setSelectedTag(value);
    const newUrl = new URL(window.location.href);
    if (value === "all") {
      newUrl.searchParams.delete("tag");
    } else {
      newUrl.searchParams.set("tag", value);
    }
    window.history.replaceState({}, "", newUrl.toString());
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTag("all");
    window.history.replaceState({}, "", window.location.pathname);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">Failed to Load Robots</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong while fetching robots data.
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Browse Robots</h1>
        <p className="text-xl text-muted-foreground">
          Discover amazing robots from the community
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search robots..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>


          {/* Tag Filter */}
          <Select value={selectedTag} onValueChange={handleTagChange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(({ tag, count }) => (
                <SelectItem key={tag} value={tag}>
                  #{tag} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        {/* Active Filters */}
        {(searchQuery || selectedTag !== "all") && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchQuery}
                <button
                  onClick={() => handleSearch("")}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedTag !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Tag: #{selectedTag}
                <button
                  onClick={() => handleTagChange("all")}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      ) : robots.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold mb-2">No robots found</h2>
          <p className="text-muted-foreground mb-6">
            {searchQuery || selectedTag !== "all"
              ? "Try adjusting your search or filters"
              : "Be the first to add a robot to the community!"}
          </p>
          {searchQuery || selectedTag !== "all" ? (
            <Button onClick={clearFilters}>Clear Filters</Button>
          ) : (
            <Button asChild>
              <Link href="/create">Add a Robot</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            Found {robots.length} robot{robots.length !== 1 ? "s" : ""}
          </div>
          
          <RobotGrid robots={robots as RobotCardData[]} />
        </>
      )}
    </div>
  );
}

export default function RobotsPageClient() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <RobotsContent />
    </Suspense>
  );
}