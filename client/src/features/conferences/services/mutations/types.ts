export interface ICreateConferencePayload {
  conf_name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  is_active: boolean;
  open_for_papers: boolean;
  format_type: string;
  timezone: string;
  max_chairs_per_session: number;
  create_time?: string;
}

export interface ICreateConferenceResponse {
  conf_id: number;
}

export interface IUploadConferenceBannerPayload {
  conferenceId: number;
  file: File;
}

export interface IUploadConferenceBannerResponse {
  all_banners: string[];
}

export interface IDeleteConferenceBannerPayload {
  conferenceId: number;
  url_to_remove: string;
}

export interface IDeleteConferenceBannerResponse {
  remaining_banners: string[];
}
