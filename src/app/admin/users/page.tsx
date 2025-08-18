'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { redirect } from 'next/navigation'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
} from '@/components/ui/alert-dialog'
import { 
  Users, 
  Search, 
  Calendar,
  Github,
  Shield,
  User,
  Crown,
  AlertTriangle
} from 'lucide-react'
import type { Profile } from '@/lib/types'

const usersFetcher = async (key: string) => {
  const [, searchQuery, roleFilter, sortBy] = key.split('|')
  
  let query = supabase
    .from('profiles')
    .select('*')

  // Apply search filter
  if (searchQuery) {
    query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,github_username.ilike.%${searchQuery}%`)
  }

  // Apply role filter
  if (roleFilter && roleFilter !== 'all') {
    query = query.eq('role', roleFilter)
  }

  // Apply sorting
  switch (sortBy) {
    case 'name':
      query = query.order('full_name', { ascending: true, nullsFirst: false })
      break
    case 'role':
      query = query.order('role', { ascending: true })
      break
    case 'created':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data || []
}

export default function AdminUsersPage() {
  const { user, profile, loading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated')
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set())

  // Redirect if not admin
  if (!loading && (!user || profile?.role !== 'admin')) {
    redirect('/')
  }

  const { data: users = [], error, isLoading, mutate: mutateUsers } = useSWR(
    `admin-users|${searchQuery}|${roleFilter}|${sortBy}`,
    usersFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000
    }
  )

  const handleRoleChange = async (userId: string, newRole: 'user' | 'creator' | 'admin') => {
    // Don't allow changing own role
    if (userId === user?.id) {
      alert("You cannot change your own role.")
      return
    }

    // Find the user being updated
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) {
      alert("User not found.")
      return
    }

    // Prevent double updates
    if (updatingRoles.has(userId)) {
      return
    }

    const oldRole = targetUser.role
    
    // Set loading state
    setUpdatingRoles(prev => new Set(prev).add(userId))
    
    try {
      // Optimistic update - update UI immediately
      const optimisticUsers = users.map(u => 
        u.id === userId ? { ...u, role: newRole, updated_at: new Date().toISOString() } : u
      )
      
      // Update the local state optimistically
      mutateUsers(optimisticUsers, false)

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Revalidate the users list to ensure consistency
      await mutateUsers()
      
      console.log(`✅ Successfully updated ${targetUser.full_name || targetUser.username || 'User'} role from ${oldRole} to ${newRole}`)
    } catch (error: any) {
      console.error('❌ Error updating user role:', error)
      
      // Revert optimistic update on error
      await mutateUsers()
      
      // Provide specific error messages
      let errorMessage = 'Failed to update user role.'
      
      if (error.message?.includes('new row violates row-level security policy')) {
        errorMessage = 'Permission denied. You need to run the database migration to allow admin role updates.\n\nRun: psql -f scripts/fix-admin-role-update.sql'
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = 'Role update failed due to a constraint violation.'
      } else if (error.message) {
        errorMessage = `Failed to update user role: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      // Clear loading state
      setUpdatingRoles(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

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
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Failed to Load Users</h2>
          <p className="text-muted-foreground mb-6">
            {error.message || 'Something went wrong while fetching users.'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'creator':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-yellow-100 text-yellow-800">Admin</Badge>
      case 'creator':
        return <Badge className="bg-blue-100 text-blue-800">Creator</Badge>
      default:
        return <Badge variant="secondary">User</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Manage Users
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage user accounts and roles
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
                placeholder="Search users by name or username..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="creator">Creators</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="created">Date Joined</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${users.length} user${users.length === 1 ? '' : 's'} found`}
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>GitHub</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="animate-pulse flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-6 bg-gray-200 rounded w-20"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : users.length > 0 ? (
              users.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile.avatar_url || ''} />
                        <AvatarFallback>
                          {userProfile.full_name?.charAt(0) || 
                           userProfile.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          {userProfile.full_name || userProfile.username || 'Unknown User'}
                          {userProfile.id === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        {userProfile.username && userProfile.full_name && (
                          <div className="text-sm text-muted-foreground">
                            @{userProfile.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {userProfile.github_username ? (
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`https://github.com/${userProfile.github_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          @{userProfile.github_username}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={userProfile.role}
                      onValueChange={(value) => handleRoleChange(userProfile.id, value as 'user' | 'creator' | 'admin')}
                      disabled={userProfile.id === user?.id || updatingRoles.has(userProfile.id)}
                    >
                      <SelectTrigger className="w-32">
                        <div className="flex items-center gap-2">
                          {updatingRoles.has(userProfile.id) ? (
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                          ) : (
                            getRoleIcon(userProfile.role)
                          )}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="creator">Creator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(userProfile.updated_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No users found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || roleFilter !== 'all' 
                        ? 'Try adjusting your filters to see more results.'
                        : 'No users have registered yet.'
                      }
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}