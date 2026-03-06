from pydantic import BaseModel, Field, EmailStr
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

class UserDescriptionRequest(BaseModel):
    description: str

class PaperStructure(BaseModel):
    has_title: bool = Field(description="Indicates whether the paper has a clear, formal title at the beginning of the document.")
    has_abstract: bool = Field(description="Confirms the presence of a formal Abstract section summarizing the research goals and findings.")
    has_introduction: bool = Field(description="Verifies if a dedicated Introduction section is included to establish the research context and objectives.")
    has_conclusion: bool = Field(description="Confirms the presence of a Conclusion section that summarizes the paper's contributions and results.")
    well_structured: bool = Field(description="A boolean flag indicating if the document follows a logical academic flow and meets IEEE/Springer organizational standards.")
    structure_review: str = Field(description="A concise professional summary evaluating the paper's structural integrity, noting any missing essential components or organizational flaws.")

class PaperGrammar(BaseModel):
    raw_text : str = Field(description = "The exact snippet from the original document containing the error. Include only the necessary context.")
    correction: str = Field(description = "The corrected version of the text. This must ONLY fix the spelling or grammar error without changing style or punctuation.")
    error_type : str = Field(description = "Classification of the error. 'Spelling' for misspelled words; 'Grammar' for syntax, tense, or agreement issues. 'Formal' for informal, conversational, or non-academic language with professional academic phrasing.")

class PaperFormatReview(BaseModel):
    structure_review : PaperStructure = Field(description = "Structural review of the paper")
    grammar_review : List[PaperGrammar] = Field(description = "Grammar and spelling check")


class EmailSchema(BaseModel):
    recipient_email: EmailStr  
    subject: str
    body: str

class ChairRecommendation(BaseModel):
    user_id: int
    full_name: str
    organization: Optional[str]
    email: str
    similarity_score: float

class SessionChairResponse(BaseModel):
    session_id: int
    session_name: str
    recommended_chairs: List[ChairRecommendation]

class ScholarImportRequest(BaseModel):
    scholar_url: str

class ScholarAuthor(BaseModel):
    research_fields: List[str] = Field(description="List of author research fields")
    research_directions: List[str] = Field(description="List of author research directions")
    research_themes: List[str] = Field(description="List of author research themes")
