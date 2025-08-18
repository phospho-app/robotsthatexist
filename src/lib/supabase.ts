import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create the base Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Error formatting utility
function formatError(error: any, operation: string, tableName: string): string {
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        return `This ${tableName.slice(0, -1)} already exists. Please use different values.`
      case '23503': // Foreign key constraint violation
        return `Invalid reference. Please check the related data.`
      case '42P01': // Table doesn't exist
        return `Database table not found. Please contact support.`
      case 'PGRST301': // Row Level Security violation
        return `Permission denied. You don't have access to perform this action.`
      case 'PGRST116': // Not found
        return `No data found matching your request.`
      case 'PGRST204': // No content
        return `No results found.`
      default:
        return `Database error: ${error.message || 'Unknown error'}`
    }
  }
  
  if (error.message?.includes('timeout')) {
    return `Operation timed out. Please check your connection and try again.`
  }
  
  return `Failed to ${operation} ${tableName.slice(0, -1)}. Please try again.`
}

// Success message mappings
const successMessages: Record<string, Record<string, string>> = {
  robots: {
    insert: 'Robot created successfully',
    update: 'Robot updated successfully',
    delete: 'Robot deleted successfully'
  },
  reviews: {
    insert: 'Review submitted successfully',
    update: 'Review updated successfully',
    delete: 'Review deleted successfully'
  },
  robot_social_links: {
    insert: 'Social link added successfully',
    update: 'Social link updated successfully',
    delete: 'Social link removed successfully'
  },
  robot_files: {
    insert: 'File added successfully',
    update: 'File updated successfully',
    delete: 'File deleted successfully'
  },
  robot_file_ratings: {
    insert: 'Rating submitted successfully',
    update: 'Rating updated successfully',
    delete: 'Rating removed successfully'
  },
  profiles: {
    insert: 'Profile created successfully',
    update: 'Profile updated successfully',
    delete: 'Profile deleted successfully'
  }
}

// Get success message for operation
function getSuccessMessage(operation: string, tableName: string): string {
  return successMessages[tableName]?.[operation] || 
         `${tableName.slice(0, -1)} ${operation}d successfully!`
}

// Wrap query result with error handling
function wrapQueryResult(promise: Promise<any>, operation: string, tableName: string) {
  const originalThen = promise.then.bind(promise)
  
  promise.then = function(onFulfilled, onRejected) {
    return originalThen((result) => {
      if (result.error) {
        const errorMessage = formatError(result.error, operation, tableName)
        toast.error(errorMessage)
        
        // Log for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`🔴 ${operation} failed for ${tableName}:`, result.error)
        }
      } else {
        // Show success toast for mutation operations
        if (['insert', 'update', 'delete'].includes(operation)) {
          const successMessage = getSuccessMessage(operation, tableName)
          toast.success(successMessage)
          
          // Log for debugging in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ ${operation} succeeded for ${tableName}:`, result.data)
          }
        }
      }
      
      return onFulfilled ? onFulfilled(result) : result
    }, onRejected)
  }
  
  return promise
}

// Create the enhanced Supabase client with Proxy
export const supabase = new Proxy(supabaseClient, {
  get(target, prop) {
    if (prop === 'from') {
      return function(table: string) {
        const tableClient = target.from(table)
        
        // Proxy the table client to intercept operations
        return new Proxy(tableClient, {
          get(tableTarget, tableProp) {
            const original = tableTarget[tableProp as keyof typeof tableTarget]
            
            // Intercept mutation operations
            if (['insert', 'update', 'delete'].includes(tableProp as string) && typeof original === 'function') {
              return function(...args: any[]) {
                const query = (original as (...args: any[]) => any).apply(tableTarget, args)
                return wrapQueryResult(query, tableProp as string, table)
              }
            }
            
            return original
          }
        })
      }
    }
    
    return target[prop as keyof typeof target]
  }
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'creator' | 'admin'
          github_username: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'creator' | 'admin'
          github_username?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'creator' | 'admin'
          github_username?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      robots: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          github_url: string | null
          github_readme: string | null
          creator_id: string
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
          image_url: string | null
          tags: string[]
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          github_url?: string | null
          github_readme?: string | null
          creator_id: string
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
          image_url?: string | null
          tags?: string[]
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          github_url?: string | null
          github_readme?: string | null
          creator_id?: string
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
          image_url?: string | null
          tags?: string[]
        }
      }
      robot_files: {
        Row: {
          id: string
          robot_id: string
          file_type: 'urdf' | 'mjcf' | 'stl' | 'bom' | 'guide'
          file_url: string
          file_name: string
          version: string
          description: string | null
          user_id: string | null
          is_owner_added: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          robot_id: string
          file_type: 'urdf' | 'mjcf' | 'stl' | 'bom' | 'guide'
          file_url: string
          file_name: string
          version: string
          description?: string | null
          user_id?: string | null
          is_owner_added?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          robot_id?: string
          file_type?: 'urdf' | 'mjcf' | 'stl' | 'bom' | 'guide'
          file_url?: string
          file_name?: string
          version?: string
          description?: string | null
          user_id?: string | null
          is_owner_added?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      robot_file_ratings: {
        Row: {
          id: string
          file_id: string
          user_id: string
          rating: 'up' | 'down'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          file_id: string
          user_id: string
          rating: 'up' | 'down'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          user_id?: string
          rating?: 'up' | 'down'
          created_at?: string
          updated_at?: string
        }
      }
      robot_social_links: {
        Row: {
          id: string
          robot_id: string
          platform: 'youtube' | 'twitter' | 'discord' | 'documentation'
          url: string
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          robot_id: string
          platform: 'youtube' | 'twitter' | 'discord' | 'documentation'
          url: string
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          robot_id?: string
          platform?: 'youtube' | 'twitter' | 'discord' | 'documentation'
          url?: string
          title?: string | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          robot_id: string
          user_id: string
          rating: number
          comment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          robot_id: string
          user_id: string
          rating: number
          comment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          robot_id?: string
          user_id?: string
          rating?: number
          comment?: string
          created_at?: string
          updated_at?: string
        }
      }
      robot_urdf_files: {
        Row: {
          id: string
          robot_id: string
          url: string
          name: string
          description: string | null
          added_by: string | null
          is_owner_added: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          robot_id: string
          url: string
          name: string
          description?: string | null
          added_by?: string | null
          is_owner_added?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          robot_id?: string
          url?: string
          name?: string
          description?: string | null
          added_by?: string | null
          is_owner_added?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      robot_urdf_votes: {
        Row: {
          id: string
          urdf_file_id: string
          user_id: string
          vote_type: 'up' | 'down'
          created_at: string
        }
        Insert: {
          id?: string
          urdf_file_id: string
          user_id: string
          vote_type: 'up' | 'down'
          created_at?: string
        }
        Update: {
          id?: string
          urdf_file_id?: string
          user_id?: string
          vote_type?: 'up' | 'down'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}