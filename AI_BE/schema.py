from pydantic import BaseModel
from typing import List, Optional

class AuthorInfo(BaseModel):
    full_name: str
    email: str
    organization: Optional[str] = None

class ConferenceInfo(BaseModel):
    conf_name: str
    is_active: bool

class VersionInfo(BaseModel):
    version_id: int
    version_number: int
    file_path: str
    is_final: bool
    plagiarism_safe: Optional[bool]
    format_ok: Optional[bool]
    upload_date: str

class ReviewInfo(BaseModel):
    review_id: int
    score: Optional[float]
    recommendation: Optional[str]
    status: str

class SessionInfo(BaseModel):
    session_name: str
    start_time: Optional[str]
    room_location: Optional[str]

class SessionLink(BaseModel):
    presentation_order: Optional[int]
    session: Optional[SessionInfo]

class PaperDetailResponse(BaseModel):
    paper_id: int
    title: str
    abstract: Optional[str]
    status: str
    created_at: str
    
    author: Optional[AuthorInfo]
    conference: Optional[ConferenceInfo]
    versions: List[VersionInfo] = []
    reviews: List[ReviewInfo] = []
    session_links: List[SessionLink] = []

class PaperSummary(BaseModel):
    paper_id: int
    title: str
    abstract: Optional[str] = None

class AutoSessionRequest(BaseModel):
    paper_ids: List[int]
    n_session: int
    min_paper: int = 1
    max_paper: int = 10
    session_duration_minutes: int = 180

class NLPAnalysisResult(BaseModel):
    review_id: int
    depth_score: float
    sentiment_score: float
    sentiment_magnitude: float
    entity_count: int
