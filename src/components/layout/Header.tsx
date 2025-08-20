"use client";

import Link from "next/link";
import { useState } from "react";
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
import {
  Bot,
  User,
  Settings,
  LogOut,
  Shield,
  BotIcon,
  PlusCircle,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { RobotSearch } from "@/components/RobotSearch";

export function Header() {
  const { user, profile, signOut, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="flex items-center space-x-2"
            prefetch={false}
          >
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-primary">
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
              prefetch={false}
            >
              All Robots
            </Link>
            <Link
              href="/create"
              className="text-sm font-medium transition-colors hover:text-primary flex flex-row items-center"
            >
              <Plus className="inline size-3" />
              <BotIcon className="inline size-4 mr-2" />
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

        {/* User Menu and Mobile Menu Button */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 transition-transform duration-200 ease-in-out rotate-0" />
            ) : (
              <Menu className="h-6 w-6 transition-transform duration-200 ease-in-out" />
            )}
          </Button>

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

      {/* Mobile Navigation Menu */}
      <div
        className={`lg:hidden border-t bg-background/95 backdrop-blur transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="container mx-auto px-4 py-4 space-y-4">
          <div className="md:hidden mb-4">
            <RobotSearch />
          </div>

          <Link
            href="/"
            className="block text-sm font-medium transition-colors hover:text-primary py-2"
            onClick={closeMobileMenu}
          >
            Home
          </Link>
          <Link
            href="/robots"
            className="block text-sm font-medium transition-colors hover:text-primary py-2"
            onClick={closeMobileMenu}
            prefetch={false}
          >
            All Robots
          </Link>
          <Link
            href="/create"
            className="block text-sm font-medium transition-colors hover:text-primary py-2 flex items-center"
            onClick={closeMobileMenu}
          >
            <Plus className="inline size-3 mr-2" />
            <BotIcon className="inline size-4 mr-2" />
            Add Robot
          </Link>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="block text-sm font-medium transition-colors hover:text-primary py-2 flex items-center"
              onClick={closeMobileMenu}
            >
              <Shield className="inline h-4 w-4 mr-2" />
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
