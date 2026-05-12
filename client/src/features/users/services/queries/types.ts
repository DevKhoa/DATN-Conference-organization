export interface ChairCandidate {
  user_id: number;
  full_name: string;
  email: string;
  organization: string;
  description?: string | null;
  similarity_score?: number;
}

export interface ProfileData {
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
  description: string | null;
  created_at: string;
  role_name: string;
  role_id: number;
  avatar_url: string | null;
  google_refresh_token: string | null;
}
