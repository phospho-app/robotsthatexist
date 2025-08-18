/**
 * Centralized Type Definitions
 * Single source of truth for all TypeScript interfaces used across the application
 */

// ============================================================================
// CORE DATABASE TYPES (matching Supabase schema)
// ============================================================================

export interface Robot {
  id: string;
  name: string;
  slug: string;
  description: string;
  github_url: string | null;
  image_url: string | null;
  tags: string[];
  creator_id: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  cached_readme_html?: string | null;
  readme_updated_at?: string | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  robot_id: string;
  user_id: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  github_username: string | null;
  role: 'user' | 'creator' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: string;
  robot_id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface RobotFile {
  id: string;
  robot_id: string;
  file_type: 'urdf' | 'mjcf' | 'stl' | 'bom' | 'guide';
  file_url: string;
  file_name: string;
  version: string;
  description: string | null;
  user_id: string | null;
  is_owner_added: boolean;
  created_at: string;
  updated_at: string;
  ratings?: {
    up: number;
    down: number;
    userRating?: 'up' | 'down' | null;
    score: number;
  };
}

// ============================================================================
// EXTENDED TYPES (with relations/computed fields)
// ============================================================================

export interface RobotWithRelations extends Robot {
  profiles?: Profile;
  robot_social_links?: SocialLink[];
  reviews?: Review[];
  average_rating?: number;
  review_count?: number;
}

export interface RobotCardData extends Robot {
  profiles?: Profile;
  robot_social_links?: SocialLink[];
  average_rating?: number;
  review_count?: number;
}

export interface RobotSearchData {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  image_url: string | null;
  github_url: string | null;
  robot_social_links: SocialLink[];
}

export interface ServerRobot extends Robot {
  profiles?: Profile;
}

export interface ServerReview extends Review {
  profiles?: Profile;
}

export interface AdminReview {
  id: string;
  robot_id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    github_username: string | null;
  };
  robots?: {
    name: string;
    slug: string;
  };
}

export type ServerSocialLink = SocialLink;

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export type RobotFormData = Omit<Robot, 'id' | 'created_at' | 'updated_at' | 'slug' | 'creator_id'>;

export type SocialLinkFormData = Omit<SocialLink, 'id' | 'robot_id' | 'created_at'>;

export interface RobotCreateData {
  name: string;
  description: string;
  github_url?: string;
  image_url?: string;
  tags: string[];
  socialLinks?: SocialLinkFormData[];
}

export interface RobotUpdateData extends Partial<RobotCreateData> {
  id: string;
  status?: 'draft' | 'published';
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface RobotCardProps {
  robot: RobotCardData;
}

export interface RobotDetailClientProps {
  initialReadme?: string | null;
}

export interface RobotSearchProps {
  onSelect?: () => void;
}

export interface RobotFileListProps {
  robotId: string;
  isOwner?: boolean;
  className?: string;
}

export interface ReviewFormProps {
  robotId: string;
  onReviewSubmitted?: () => void;
  mutateKey?: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string;
    is_anonymous: boolean;
  } | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface RobotListResponse {
  robots: RobotWithRelations[];
  total: number;
}

export interface SearchResult {
  robots: Robot[];
  query: string;
  total: number;
}

export interface RobotDetailResponse {
  robot: ServerRobot | null;
  reviews: ServerReview[];
  socialLinks: ServerSocialLink[];
  averageRating: number;
  reviewCount: number;
  readme: string | null;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface RobotReviewStats {
  average_rating: number;
  review_count: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  query?: string;
  tags?: string[];
  sortBy?: 'newest' | 'oldest' | 'name' | 'rating';
}

export interface FileUploadResult {
  success: boolean;
  filename?: string;
  error?: string;
  url?: string;
}

// ============================================================================
// PLATFORM/SOCIAL TYPES
// ============================================================================

export type PlatformType = 
  | 'github'
  | 'discord' 
  | 'youtube'
  | 'twitter'
  | 'documentation'
  | 'website';

export interface PlatformInfo {
  type: PlatformType;
  displayName: string;
  color: string;
  icon: React.ComponentType<any>;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: any;
}

export interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface FormError {
  field: string;
  message: string;
}

export interface ValidationError {
  errors: FormError[];
  isValid: boolean;
}