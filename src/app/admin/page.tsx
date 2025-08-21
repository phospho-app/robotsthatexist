"use client";

import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "@/components/ui/link";
import {
  Bot,
  Users,
  MessageSquare,
  Shield,
  AlertTriangle,
} from "lucide-react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";

const adminStatsFetcher = async () => {
  const [robotsResult, usersResult, reviewsResult] = await Promise.all([
    supabase.from("robots").select("id, status").eq("status", "published"),
    supabase.from("profiles").select("id, role"),
    supabase.from("reviews").select("id"),
  ]);

  return {
    totalRobots: robotsResult.data?.length || 0,
    totalUsers: usersResult.data?.length || 0,
    totalReviews: reviewsResult.data?.length || 0,
    creators:
      usersResult.data?.filter(
        (u) => u.role === "creator" || u.role === "admin"
      ).length || 0,
  };
};

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth();

  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR("admin-stats", adminStatsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  // Redirect if not admin
  if (!loading && (!user || profile?.role !== "admin")) {
    redirect("/");
  }

  if (loading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Failed to Load Admin Data</h2>
          <p className="text-muted-foreground mb-6">
            {statsError.message ||
              "Something went wrong while fetching admin statistics."}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage robots, users, and site content
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          Admin Access
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Robots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRobots || 0}</div>
            <p className="text-xs text-muted-foreground">Published robots</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.creators || 0} creators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground">User reviews</p>
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/robots">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Manage Robots
              </CardTitle>
              <CardDescription>
                View, edit, and manage all robot entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create new robots, edit existing ones, and manage their status
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/users">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Users
              </CardTitle>
              <CardDescription>
                View and manage user accounts and roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage user roles, permissions, and account status
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/admin/reviews">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Manage Reviews
              </CardTitle>
              <CardDescription>
                Moderate reviews and handle reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review flagged content and moderate user reviews
              </p>
            </CardContent>
          </Link>
        </Card>

      </div>
    </div>
  );
}
