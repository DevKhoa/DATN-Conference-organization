export interface PlagiarismRequestPayload {
  paperId: number;
  versionId: number;
  threshold?: number;
}

export interface PlagiarismResult {
  plagiarism_percentage: number;
  details?: Array<{
    input_chunk_index: number;
    source_text: string;
    source_similarity: number;
  }>;
}

export interface GrammarIssue {
  error_type: string;
  raw_text: string;
  correction: string;
}

export interface GrammarReviewResult {
  structure_review?: Record<string, boolean>;
  grammar_review?: GrammarIssue[];
}

export interface AnalyzeReviewResult {
  sentiment_score: number;
  depth_score?: number | null;
}

export interface CreatePaperPayload {
  title: string;
  abstract: string;
  primaryAuthorId: number;
  conferenceId: number;
  coAuthorIds?: number[];
}

export interface CreatePaperResult {
  paper_id: number;
}

export interface UploadPaperVersionPayload {
  paperId: number;
  uploaderId: number;
  file: File;
  display: boolean;
}

export interface UploadPaperVersionResult {
  version_id: number;
  file_path: string | null;
}

export interface SavePaperAwardMarkingPayload {
  paperId: number;
  awardId: number;
  userId: number;
  comments?: string | null;
  scores: Array<{
    criteriaId: number;
    score: number;
  }>;
  existingMarkId?: number | null;
}
