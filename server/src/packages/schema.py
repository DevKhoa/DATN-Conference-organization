from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from enum import Enum


class AuthorInfo(BaseModel):
    full_name: str
    email: str
    organization: Optional[str] = None

class ConferenceInfo(BaseModel):
    conf_name: str
    is_active: bool
    format_type: Optional[str] = None
    timezone: Optional[str] = None

class VersionInfo(BaseModel):
    version_id: int
    version_number: int
    file_path: str
    is_final: bool
    plagiarism_safe: Optional[bool]
    format_ok: Optional[bool]
    upload_date: str
    format_type: Optional[str] = None
    meet_link: Optional[str] = None
    record_video_url: Optional[str] = None

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

class CoauthorInfo(BaseModel):
    author_order: Optional[int]
    profile: Optional[AuthorInfo]

class PaperDetailResponse(BaseModel):
    paper_id: int
    title: str
    abstract: Optional[str]
    status: str
    created_at: str
    
    author: Optional[AuthorInfo]
    coauthors: List[CoauthorInfo] = []
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
    similarity: str
    match_score: float

class SessionChairResponse(BaseModel):
    session_id: int
    session_name: str
    recommended_chairs: List[ChairRecommendation]

class ChairInvitationCreateRequest(BaseModel):
    email: EmailStr
    invited_by: Optional[int] = Field(
        None,
        description="Optional profile user_id of the person creating the invitation",
    )
    client_url: Optional[str] = Field(
        None,
        description="The base URL of the client to generate the invite link. If not provided, CLIENT_URL env var is used.",
    )


class ChairInvitationDecisionRequest(BaseModel):
    user_id: Optional[int] = Field(
        None,
        description="Optional profile user_id of the invitee when accepting or rejecting",
    )
    email: Optional[EmailStr] = Field(
        None,
        description="Optional email to verify the invitee identity",
    )


class ChairInvitationResponse(BaseModel):
    invitation_id: str
    conf_id: int
    conf_name: Optional[str] = None
    session_id: int
    session_name: Optional[str] = None
    email: str
    status: str
    token: str
    invited_by: Optional[int] = None
    created_at: Optional[str] = None
    responded_at: Optional[str] = None
    invitee_user_id: Optional[int] = None
    invite_link: Optional[str] = None

class ScholarImportRequest(BaseModel):
    scholar_url: str

class ScholarAuthor(BaseModel):
    research_fields: List[str] = Field(description="List of author research fields")
    research_directions: List[str] = Field(description="List of author research directions")
    research_themes: List[str] = Field(description="List of author research themes")

class CheckinRequest(BaseModel):
    registration_id: int
    session_ids: List[int]

class RegistrationBeforePaymentRequest(BaseModel):
    user_id: int = Field(..., description="ID of the user registering")
    ticket_id: int = Field(..., description="ID of the ticket to register for")
    provider: str = Field(..., description="Payment provider (only 'PAYOS' accepted)")
    returnUrl: str = Field(..., description="URL to redirect after payment completion or cancellation")

class RegistrationPaymentRequest(BaseModel):
    provider: str = Field(..., description="Payment provider (only 'PAYOS' accepted)")
    returnUrl: str = Field(..., description="URL to redirect after payment completion or cancellation")


class SubscriptionCreateRequest(BaseModel):
    user_id: int = Field(..., description="ID of the user purchasing the subscription")
    plan_id: int = Field(..., description="ID of the subscription plan")
    provider: str = Field(..., description="Payment provider (only 'PAYOS' accepted)")
    returnUrl: str = Field(..., description="URL to redirect after payment completion or cancellation")

class SubscriptionUpgradeRequest(BaseModel):
    user_id: int = Field(..., description="ID of the user upgrading")
    new_plan_code: str = Field(..., description="Plan code of the plan to upgrade to")
    provider: str = Field(..., description="Payment provider (only 'PAYOS' accepted)")
    returnUrl: str = Field(..., description="URL to redirect after payment completion or cancellation")

class PersonalInformation(BaseModel):
    full_name:  Optional[str] = Field(None, description="Full name of the candidate")
    email:      Optional[str] = Field(None, description="Email address of the candidate")
    phone:      Optional[str] = Field(None, description="Contact phone number")
    location:   Optional[str] = Field(None, description="Current location or address")
    linkedin:   Optional[str] = Field(None, description="Full URL to LinkedIn profile, or null if not present")
    github:     Optional[str] = Field(None, description="Full URL to GitHub profile, or null if not present")
    portfolio:  Optional[str] = Field(None, description="Full URL to personal website, or null if not present")

class Education(BaseModel):
    institution:    Optional[str] = Field(None, description="Name of the university or institution")
    degree:         Optional[str] = Field(None, description="Degree obtained (e.g. Bachelor, Master)")
    field_of_study: Optional[str] = Field(None, description="Academic major or field of study")
    gpa:            Optional[str] = Field(None, description="GPA if mentioned")
    start_year:     Optional[str] = Field(None, description="Year the program started")
    end_year:       Optional[str] = Field(None, description="Graduation year or 'Present'")

class WorkExperience(BaseModel):
    company:            Optional[str]       = Field(None, description="Company or organization name")
    position:           Optional[str]       = Field(None, description="Job title or role")
    location:           Optional[str]       = Field(None, description="Work location")
    start_date:         Optional[str]       = Field(None, description="Start date (month/year)")
    end_date:           Optional[str]       = Field(None, description="End date (month/year) or 'Present'")
    responsibilities:   Optional[List[str]] = Field(None, description="Responsibilities and achievements")

class Project(BaseModel):
    name:           Optional[str]       = Field(None, description="Project name")
    start_date:     Optional[str]       = Field(None, description="Start date")
    end_date:       Optional[str]       = Field(None, description="End date")
    technologies:   Optional[List[str]] = Field(None, description="Tech stack used")
    description:    Optional[List[str]] = Field(None, description="Key contributions and outcomes")

class Skills(BaseModel):
    programming_languages:      Optional[List[str]] = Field(None, description="e.g. Python, C++, SQL")
    frameworks_and_libraries:   Optional[List[str]] = Field(None, description="e.g. PyTorch, LangChain")

class Article(BaseModel):
    title:  Optional[str] = Field(None, description="Title of the paper or article")
    venue:  Optional[str] = Field(None, description="Conference or journal name")
    link:   Optional[str] = Field(None, description="URL to the paper")


class CVBaseModel(BaseModel):
    personal_information:   Optional[PersonalInformation]   = Field(None, description="Personal and contact information")
    professional_summary:   Optional[str]                   = Field(None, description="Career objective or professional summary")
    education:              Optional[List[Education]]        = Field(None, description="Educational background — null if none found")
    work_experience:        Optional[List[WorkExperience]]   = Field(None, description="Employment history — null if none found")
    projects:               Optional[List[Project]]          = Field(None, description="Personal or academic projects — null if none found")
    skills:                 Optional[Skills]                 = Field(None, description="Technical skills grouped by category")
    research_fields:        Optional[List[str]]              = Field(None, description="Research disciplines — null if not a research CV")
    research_directions:    Optional[List[str]]              = Field(None, description="Research goals — null if not a research CV")
    research_themes:        Optional[List[str]]              = Field(None, description="Overarching research themes — null if not a research CV")
    articles:               Optional[List[Article]]          = Field(None, description="Academic publications — null if none found")


class SendMessagePayload(BaseModel):
    parent_id: Optional[int] = None  
    content: str
    tab_id: Optional[str] = None

class SessionAuthResponse(BaseModel):
    auth_url: str
    state: str

class GoogleMeetCallbackRequest(BaseModel):
    state: str
    code: str

class MeetCreationRequest(BaseModel):
    session_id: int
    email: str = Field(..., description="Email của người uỷ quyền tạo phòng hẹn")

class MeetCreationResponse(BaseModel):
    event_id: str
    meet_link: str
    html_link: str

class QuestionCreate(BaseModel):
    paper_id: int = Field(..., description="ID of the paper")
    author_id: int = Field(..., description="ID of the user asking the question")
    content: str = Field(..., min_length=1, description="Question content")
    attendee_type: str = Field(..., description="'in-person' or 'virtual'")

class QuestionStatusUpdate(BaseModel):
    status: str = Field(..., description="'pending', 'approved', 'denied', or 'done'")

class QuestionAnswer(BaseModel):
    user_id: int = Field(..., description="ID of the user answering (must be author)")
    answer_type: str = Field(..., description="'direct' or 'written'")
    answer_content: Optional[str] = Field(None, description="Written answer text")

class QuestionResponse(BaseModel):
    question_id: int
    session_id: int
    paper_id: int
    author_id: int
    author_name: Optional[str] = None
    content: str
    attendee_type: str
    status: str
    answer_type: Optional[str] = None
    answer_content: Optional[str] = None
    answered_at: Optional[str] = None
    upvotes_count: int
    created_at: str
    is_upvoted: bool = False


class RelevanceLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    
class RelatedProfilePaper(BaseModel):
    title: str = Field(
        description="The exact title of the related paper from the author's existing profile."
    )
    reasoning: str = Field(
        description="Explanation of why this existing paper is connected to the new paper being evaluated."
    )

class PaperEvaluation(BaseModel):
    new_paper_title: str = Field(
        description="The title of the new paper being evaluated."
    )
    relevance_score: RelevanceLevel = Field(
        description="The assessed relevance of the new paper to the author's core research profile."
    )
    reasoning: str = Field(
        description="Detailed justification for the assigned relevance score, based on the author's research interests and past work."
    )
    related_profile_papers: Optional[List[RelatedProfilePaper]] = Field(
        None,
        description=(
            "List of existing papers from the author's profile that are relevant to this new paper. "
            "Omit this field entirely if no existing papers are clearly related."
        )
    )

class AuthorProfileAnalysis(BaseModel):
    analyzed_papers: List[PaperEvaluation] = Field(
        description="The complete list of evaluations for all newly provided papers."
    )


class MatchReviewRequest(BaseModel):
    user_id: int = Field(..., description="ID of the chair candidate to evaluate against the session's papers")


class MatchReviewResponse(BaseModel):
    session_id: int
    session_name: str
    user_id: int
    analysis: AuthorProfileAnalysis