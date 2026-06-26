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

export interface PaperDetailAuthor {
  full_name: string | null;
  email: string | null;
  organization: string | null;
  description: string | null;
}

export interface PaperDetailConference {
  conf_name: string | null;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface PaperDetailReview {
  review_id: number;
  score: number | null;
  recommendation: string | null;
  comments: string | null;
  review_date: string | null;
  reviewer: {
    full_name: string | null;
  } | null;
}

export interface PaperAwardCriterion {
  criteria_id: number;
  criteria_name: string;
  weight_pct: number;
}

export interface PaperAwardExistingMarking {
  mark_id: number;
  comments: string;
  total_score: number | null;
  scoresByCriteriaId: Record<number, number>;
}

export interface PaperApplicableAward {
  award_id: number;
  name: string;
  description: string | null;
  open_time: string | null;
  close_time: string | null;
  canMark: boolean;
  criteria: PaperAwardCriterion[];
  existingMarking: PaperAwardExistingMarking | null;
}

export interface PaperDetailCoauthor {
  author_order: number | null;
  profile: PaperDetailAuthor | null;
}

export interface PublicPaperDetailPageData {
  paper: {
    paper_id: number;
    title: string;
    abstract: string | null;
    status: string | null;
    created_at: string | null;
    submitted_conf: number | null;
    author: PaperDetailAuthor | null;
    coauthors?: PaperDetailCoauthor[];
    conference: PaperDetailConference | null;
  };
  pdfUrl: string | null;
  reviews: PaperDetailReview[];
  applicableAwards: PaperApplicableAward[];
}

export interface PaperMarkingDetail {
  criteria_name: string;
  weight_pct: number;
  score: number;
}

export interface PaperMarkingRecord {
  mark_id: number;
  total_score: number | null;
  comments: string | null;
  marked_at: string | null;
  award: {
    name: string;
  };
  marker: {
    full_name: string | null;
    role: string | null;
  };
  details: PaperMarkingDetail[];
}
