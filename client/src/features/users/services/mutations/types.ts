export interface UpdateBasicInfoPayload {
  userId: number;
  fullName: string;
  organization: string;
}

export interface UploadAvatarPayload {
  userId: number;
  file: File;
}

export interface UpdateDescriptionPayload {
  userId: number;
  description: string;
}

export interface UploadCVPayload {
  userId: number;
  file: File;
}

export interface ImportScholarPayload {
  userId: number;
  scholarUrl: string;
}

export interface UploadAvatarResponse {
  avatar_url?: string;
}
