export interface ChairCandidate {
  user_id: number;
  full_name: string;
  email: string;
  organization: string;
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
}
