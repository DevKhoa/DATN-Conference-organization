export interface Paper {
  paper_id: number;
  title: string;
  abstract: string | null;
  status: string | null;
  created_at: string | null;
  final_decision_date: string | null;
  submitted_conf: number | null;
  primary_author_id: number | null;
  author?: {
    full_name: string;
  };
  conference?: {
    conf_name: string;
  };
}

export interface PaginatedPapersParams {
  page: number;
  pageSize: number;
}

export interface SubmitConference {
  conf_id: number;
  conf_name: string;
  start_date: string | null;
  location: string | null;
}

export interface SubmitAuthor {
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
}

export interface SubmitExistingPaper {
  paper_id: number;
  title: string;
  author_name: string;
}
