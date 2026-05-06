export interface Conference {
  conf_id: number;
  conf_name: string;
  start_date: string;
  location: string;
  format_type?: string | null;
}

export interface ConferenceDetail extends Conference {
  end_date: string;
  status: string;
  is_active: boolean;
  description: string;
  banner_urls: string[] | null;
  keywords: string[] | null;
  open_for_papers: boolean;
}
