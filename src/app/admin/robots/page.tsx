"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Bot,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Github,
  AlertTriangle,
} from "lucide-react";
import Link from "@/components/ui/link";

const robotsFetcher = async (key: string) => {
  const [, searchQuery, , sortBy] = key.split("|");

  let query = supabase.from("robots").select(`
      *,
      profiles (
        username,
        full_name,
        avatar_url,
        github_username
      )
    `);

  // Apply search filter
  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
    );
  }


  // Apply sorting
  switch (sortBy) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "created":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch robots: ${error.message}`);
  }

  return data || [];
};

export default function AdminRobotsPage() {
  const { user, profile, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Redirect if not admin
  if (!loading && (!user || profile?.role !== "admin")) {
    redirect("/");
  }

  const {
    data: robots = [],
    error,
    isLoading,
    mutate: mutateRobots,
  } = useSWR(
    `admin-robots|${searchQuery}||${sortBy}`,
    robotsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const handleDeleteRobot = async (robotId: string, robotName: string) => {
    setIsDeleting(robotId);

    try {
      const { error } = await supabase
        .from("robots")
        .delete()
        .eq("id", robotId);

      if (error) throw error;

      // Revalidate the robots list
      await mutateRobots();

      // Show success message
      alert(`Robot "${robotName}" has been deleted successfully.`);
    } catch (error: any) {
      console.error("Error deleting robot:", error);
      alert(`Failed to delete robot: ${error.message}`);
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
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h2 className="text-2xl font-bold mb-2">Failed to Load Robots</h2>
          <p className="text-muted-foreground mb-6">
            {error.message || "Something went wrong while fetching robots."}
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
            <Bot className="h-8 w-8 text-primary" />
            Manage Robots
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and manage all robot entries
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/robots/create">
            <Plus className="h-4 w-4 mr-2" />
            Add Robot
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search robots by name or description..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>


            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="created">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
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
            : `${robots.length} robot${robots.length === 1 ? "" : "s"} found`}
        </p>
      </div>

      {/* Robots Table */}
      <Card>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Robot</TableHead>
              <TableHead className="w-[25%]">Creator</TableHead>
              <TableHead className="w-[12%]">Created</TableHead>
              <TableHead className="w-[12%]">Updated</TableHead>
              <TableHead className="w-[11%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-8 bg-gray-200 rounded w-24 ml-auto"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : robots.length > 0 ? (
              robots.map((robot) => (
                <TableRow key={robot.id}>
                  <TableCell className="max-w-0">
                    <div className="space-y-1">
                      <div className="font-medium break-words">
                        {robot.name}
                      </div>
                      <div
                        className="text-sm text-muted-foreground break-words truncate"
                        title={robot.description}
                      >
                        {robot.description}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {robot.tags.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {robot.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{robot.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={robot.profiles?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {robot.profiles?.full_name?.charAt(0) ||
                            robot.profiles?.username?.charAt(0) ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {robot.profiles?.full_name ||
                            robot.profiles?.username ||
                            "Unknown"}
                        </div>
                        {robot.profiles?.github_username && (
                          <div className="text-xs text-muted-foreground truncate">
                            @{robot.profiles.github_username}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1 text-sm text-muted-foreground pt-1">
                      <Calendar className="h-3 w-3 mt-0.5" />
                      {new Date(robot.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1 text-sm text-muted-foreground pt-1">
                      <Calendar className="h-3 w-3 mt-0.5" />
                      {new Date(robot.updated_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2 justify-end pt-1">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/robots/${robot.slug}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link
                          href={`/admin/robots/${
                            robot.id
                          }/edit?returnTo=${encodeURIComponent(
                            "/admin/robots"
                          )}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting === robot.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Robot</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{robot.name}"?
                              This action cannot be undone and will also delete
                              all associated stories, links and files.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteRobot(robot.id, robot.name)
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
                    <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No robots found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "Try adjusting your filters to see more results."
                        : "Get started by creating your first robot."}
                    </p>
                    <Button asChild>
                      <Link href="/admin/robots/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Robot
                      </Link>
                    </Button>
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
