"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, User, Settings, LogOut, Shield } from "lucide-react";
import { RobotSearch } from "@/components/RobotSearch";

export function Header() {
  const { user, profile, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <Link href="/robots" className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-green-500" />
            <span className="font-bold text-xl text-green-500">
              robots that exist
            </span>
          </Link>

          <nav className="hidden lg:flex items-center space-x-6">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link
              href="/robots"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              All Robots
            </Link>
            <Link
              href="/create"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Add Robot
            </Link>
            {profile?.role === "admin" ? (
              <Link
                href="/admin"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                <Shield className="inline h-4 w-4 mr-1" />
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 justify-center px-6 max-w-md">
          <RobotSearch />
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          ) : user && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile.avatar_url || ""}
                      alt={profile.full_name || ""}
                    />
                    <AvatarFallback>
                      {profile.full_name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {profile.full_name || profile.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile.github_username
                      ? `@${profile.github_username}`
                      : ""}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {profile.role}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
