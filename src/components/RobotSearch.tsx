"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bot, Loader2, X, FileText, ExternalLink, Youtube, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { DiscordIcon, GithubIcon } from "@/components/icons";
import { detectPlatformFromUrl } from "@/lib/platform-utils";
import { useAllRobots } from "@/lib/robot-data";
import { searchRobotsClientSide } from "@/lib/client-search-utils";
import type { RobotSearchData, SocialLink, RobotSearchProps } from "@/lib/types";

export function RobotSearch({ onSelect }: RobotSearchProps) {
  const [query, setQuery] = useState("");
  const [robots, setRobots] = useState<RobotSearchData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all robots data from SWR cache
  const { data: allRobots, isLoading: isLoadingData } = useAllRobots();

  // Search robots client-side
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setRobots([]);
      setIsOpen(false);
      return;
    }

    if (!allRobots || isLoadingData) {
      return;
    }

    try {
      const results = searchRobotsClientSide(allRobots, debouncedQuery, 8);
      setRobots(results as RobotSearchData[]);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Search error:", error);
      setRobots([]);
    }
  }, [debouncedQuery, allRobots, isLoadingData]);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || robots.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < robots.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && robots[selectedIndex]) {
            navigateToRobot(robots[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          clearSearch();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, robots, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateToRobot = (robot: RobotSearchData) => {
    router.push(`/robots/${robot.slug}`);
    clearSearch();
    onSelect?.();
  };

  const clearSearch = () => {
    setQuery("");
    setRobots([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const getSocialIcon = (link: SocialLink) => {
    // Auto-detect platform if not already detected, or use existing platform
    const detectedPlatform = link.platform || detectPlatformFromUrl(link.url);
    
    switch (detectedPlatform) {
      case "github":
        return <GithubIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />;
      case "discord":
        return <DiscordIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />;
      case "youtube":
        return <Youtube className="h-3 w-3 text-muted-foreground hover:text-foreground" />;
      case "twitter":
        return <Twitter className="h-3 w-3 text-muted-foreground hover:text-foreground" />;
      case "documentation":
        return <FileText className="h-3 w-3 text-muted-foreground hover:text-foreground" />;
      default:
        return <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search robots... (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (robots.length > 0) setIsOpen(true);
          }}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isLoadingData && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {isOpen && robots.length > 0 && (
        <Card className="absolute top-12 w-full z-50 border shadow-lg">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {robots.map((robot, index) => (
                <button
                  key={robot.id}
                  className={`w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-b-0 ${
                    index === selectedIndex ? "bg-accent" : ""
                  }`}
                  onClick={() => navigateToRobot(robot)}
                >
                  <div className="flex items-center space-x-3">
                    {robot.image_url ? (
                      <img
                        src={robot.image_url}
                        alt={robot.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Bot className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {robot.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {robot.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        {robot.tags.length > 0 && (
                          <div className="flex gap-1">
                            {robot.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {robot.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{robot.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Social Icons */}
                        <div className="flex gap-1 ml-2">
                          {robot.github_url && (
                            <a
                              href={robot.github_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-accent transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GithubIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                          {robot.robot_social_links.map((link, index) => (
                            <a
                              key={link.id || `${link.platform}-${link.url}-${index}`}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-accent transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {getSocialIcon(link)}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Search Footer */}
            <div className="p-2 bg-muted/50 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-background border rounded text-xs">↑</kbd>{" "}
                <kbd className="px-1 py-0.5 bg-background border rounded text-xs">↓</kbd> to navigate,{" "}
                <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Enter</kbd> to select,{" "}
                <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Esc</kbd> to close
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {isOpen && !isLoadingData && debouncedQuery && robots.length === 0 && (
        <Card className="absolute top-12 w-full z-50 border shadow-lg">
          <CardContent className="p-4 text-center">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No robots found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching with different keywords
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}