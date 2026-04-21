from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional

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

class ReviewInfo(BaseModel):
    review_id: int
    score: Optional[float]
    recommendation: Optional[str]
    status: str

class SessionInfo(BaseModel):
    session_name: str
    start_time: Optional[str]
    room_location: Optional[str]
    format_type: Optional[str] = None
    meet_link: Optional[str] = None
    record_video_url: Optional[str] = None

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

class PersonalInformation(BaseModel):
    full_name: str = Field(description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address of the candidate")
    phone: Optional[str] = Field(None, description="Contact phone number")
    location: Optional[str] = Field(None, description="Current location or address")
    linkedin: Optional[str] = Field(None, description="Link to the candidate's LinkedIn profile")
    github: Optional[str] = Field(None, description="Link to the candidate's GitHub profile")
    portfolio: Optional[str] = Field(None, description="Link to personal website or portfolio")

class Education(BaseModel):
    institution: str = Field(description="Name of the university or educational institution")
    degree: Optional[str] = Field(None, description="Degree obtained (e.g., Bachelor, Master, Engineer)")
    field_of_study: Optional[str] = Field(None, description="Academic major or field of study")
    start_year: Optional[str] = Field(None, description="Year when the study program started")
    end_year: Optional[str] = Field(None, description="Year of graduation or 'Present' if still studying")

class WorkExperience(BaseModel):
    company: str = Field(description="Name of the company or organization")
    position: str = Field(description="Job title or role held by the candidate")
    start_date: Optional[str] = Field(None, description="Start date of the job (month/year)")
    end_date: Optional[str] = Field(None, description="End date of the job (month/year) or 'Present'")
    responsibilities: List[str] = Field(
        default_factory=list,
        description="List of responsibilities, tasks, and achievements in this role"
    )

class Skills(BaseModel):
    technical_skills: List[str] = Field(
        default_factory=list,
        description="List of technical skills such as programming languages, frameworks, and tools"
    )
    soft_skills: List[str] = Field(
        default_factory=list,
        description="List of soft skills such as teamwork, communication, and leadership"
    )

class Project(BaseModel):
    name: str = Field(description="Name of the project")
    description: Optional[str] = Field(
        None,
        description="Brief description of the project and the candidate's role"
    )
    technologies: List[str] = Field(
        default_factory=list,
        description="List of technologies, frameworks, or programming languages used in the project"
    )

class CVBaseModel(BaseModel):
    personal_information: PersonalInformation
    professional_summary: Optional[str] = Field(
        None,
        description="Professional summary or career objective statement"
    )
    education: List[Education] = Field(default_factory=list)
    work_experience: List[WorkExperience] = Field(default_factory=list)
    skills: Skills
    projects: List[Project] = Field(default_factory=list)
    certifications: List[str] = Field(
        default_factory=list,
        description="List of certifications obtained by the candidate"
    )
    languages: List[str] = Field(
        default_factory=list,
        description="List of languages the candidate can speak or use"
    )
    awards: List[str] = Field(
        default_factory=list,
        description="List of awards or recognitions received"
    )
    additional_information: Optional[str] = Field(
        None,
        description="Any additional information that does not fit into the categories above"
    )

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
