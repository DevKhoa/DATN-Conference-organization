import os
import sys
import logging
import json
import re
import pathlib

from bs4 import BeautifulSoup, NavigableString, Tag

from typing import TypedDict, Optional, Literal, Any, Dict, List, Union

import smtplib
from email.message import EmailMessage

from pypdf import PdfReader

from google.oauth2 import service_account
from google import genai
from google.cloud import language_v2
from google.cloud import storage

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from supabase.client import create_client
from payos import AsyncPayOS
from dotenv import load_dotenv

load_dotenv()


#======================================== LOGGING ========================================#

class Logger:
    """
    A custom logging utility that routes logs to different streams based on severity.
    
    Attributes:
        logger (logging.Logger): The internal logger instance.
    """

    def __init__(self, name=__name__):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        self.logger.propagate = False

        if not self.logger.handlers:
            self._setup()

    def _setup(self):
        stdout = logging.StreamHandler(sys.stdout)
        stdout.setLevel(logging.DEBUG)
        stdout.addFilter(lambda r: r.levelno < logging.WARNING)

        stderr = logging.StreamHandler(sys.stderr)
        stderr.setLevel(logging.WARNING)

        formatter = logging.Formatter("[%(levelname)s]: [%(funcName)s] %(message)s")

        stdout.setFormatter(formatter)
        stderr.setFormatter(formatter)

        self.logger.addHandler(stdout)
        self.logger.addHandler(stderr)

    def debug(self, message: str):
        self.logger.debug(message, stacklevel=2)

    def info(self, message: str):
        self.logger.info(message, stacklevel=2)

    def warning(self, message: str):
        self.logger.warning(message, stacklevel=2)

    def error(self, message: str):
        self.logger.error(message, stacklevel=2)

    def critical(self, message: str):
        self.logger.critical(message, stacklevel=2)

    def exception(self, message: str):
        self.logger.exception(message, stacklevel=2)


def get_google_credentials():
    """Load Google credentials from env var JSON string or fallback to ADC."""
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    
    if creds_json:
        # Parse the JSON string directly
        creds_info = json.loads(creds_json)
        credentials = service_account.Credentials.from_service_account_info(
            creds_info,
        )
        return credentials
    
    return None

GOOGLE_APPLICATION_CREDENTIALS = get_google_credentials()

#======================================== CONSTANTS ========================================#

USER_ID = "agent"
MODEL = 'gemini-3-flash-preview'

SERP_API_KEY = os.environ['SERP_API_KEY']

EMBEDDING_MODEL_NAME = "gemini-embedding-001"

BUCKET_NAME = "conferences-organization-bucket-master"
FILE_TEMP_DIR = "temp_storage"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

CHUNK_SIZE = 1000 
CHUNK_OVERLAP = 200
VECTOR_DIMENSION = 1536

AUTHOR_ROLE_ID = 3
CHAIR_ROLE_ID = 6
REVIEWER_ROLE_ID = 4

MAX_CV_SIZE_MB = 3
MAX_PAPER_SIZE_MB = 5

logger = Logger()

genai_client = genai.Client(credentials=GOOGLE_APPLICATION_CREDENTIALS)
language_client = language_v2.LanguageServiceClient(credentials=GOOGLE_APPLICATION_CREDENTIALS)
storage_client = storage.Client(credentials=GOOGLE_APPLICATION_CREDENTIALS)

embedding_model = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL_NAME, output_dimensionality=VECTOR_DIMENSION)
supabase_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

PAYOS_CLIENT_ID = os.environ.get("PAYOS_CLIENT_ID")
PAYOS_API_KEY = os.environ.get("PAYOS_API_KEY")
PAYOS_CHECKSUM_KEY = os.environ.get("PAYOS_CHECKSUM_KEY")
payos_client = AsyncPayOS(
    client_id=PAYOS_CLIENT_ID,
    api_key=PAYOS_API_KEY,
    checksum_key=PAYOS_CHECKSUM_KEY
)


PROMPTS_DIR = pathlib.Path(__file__).resolve().parents[2] / "Prompts"


def _load_prompt_file(filename: str) -> str:
    prompt_path = PROMPTS_DIR / filename
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


SESSION_TITLE_GIVER = _load_prompt_file("session_title_giver.txt")

FORMAT_REVIEWER = _load_prompt_file("format_reviewer.txt")

SCHOLAR_PROMPT = _load_prompt_file("scholar_retriever.txt")

CV_RETRIEVER = _load_prompt_file("cv_retriever.txt")

ASSISTANCE_INSTRUCTION = _load_prompt_file("assistance_agent.txt")

CONV_TITLE_GIVER = _load_prompt_file("conversation_title_giver.txt")

PAPER_MATCH_REVIEWER = _load_prompt_file("paper_match_reviewer.txt")

#======================================== HELPER FUNCTIONS ========================================#

_FALLBACK_RATES_TO_VND: dict[str, float] = {
    "VND": 1.0,
    "USD": 25450.0,
    "EUR": 27100.0,
}

def get_exchange_rate_to_vnd(from_currency: str) -> float:

    currency = from_currency.upper()
    if currency == "VND":
        return 1.0
    try:
        import requests as _req
        resp = _req.get(
            f"https://open.er-api.com/v6/latest/{currency}",
            timeout=5,
        )
        data = resp.json()
        if data.get("result") == "success":
            rate = data["rates"].get("VND")
            if rate:
                logger.info(f"[ExchangeRate] 1 {currency} = {rate} VND (realtime)")
                return float(rate)
    except Exception as e:
        logger.error(f"[ExchangeRate] Không lấy được tỷ giá realtime: {e}")
    fallback = _FALLBACK_RATES_TO_VND.get(currency, 1.0)
    logger.warning(f"[ExchangeRate] Dùng tỷ giá fallback: 1 {currency} = {fallback} VND")
    return fallback

def load_file_local(file_path):
   
    if not os.path.exists(file_path):
        logger.error(f"File path not exists: {file_path}")
        return None

    _, file_extension = os.path.splitext(file_path)
    file_extension = file_extension.lower()
    
    loader = None
    docs = []

    try:
        if file_extension == ".pdf":
            loader = PyPDFLoader(file_path)
            
        elif file_extension == ".docx":
            loader = Docx2txtLoader(file_path)
            
        elif file_extension == ".txt":
            loader = TextLoader(file_path, encoding="utf-8")
            
        else:
            logger.error(f"{file_extension} file extension not supported")
            return None

        docs = loader.load()
        logger.info(f"Loaded file from {file_path}")
        return docs
    except Exception as e:
        logger.error(f"Error when loading file {e}")
        return None

def clean_text(text: str) -> str:
        if not text:
            return ""
        text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

def clean_documents(docs: List[Document]) -> List[Document]:
        cleaned_docs = []
        for doc in docs:
            original_text = doc.page_content
            cleaned_text = clean_text(original_text)
            
            doc.page_content = cleaned_text
            cleaned_docs.append(doc)
        return cleaned_docs

def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    total_text = ""
    for page in reader.pages:
        total_text += page.extract_text() or "" 
    return total_text

def valid_check(file_path: pathlib.Path, max_size_mb: float, extensions: List[str]) -> Dict[str, Union[bool, str]]:
    
    if not file_path.exists() or not file_path.is_file():
        return {"valid": False, "code": "FILE_NOT_FOUND"}

    allowed_exts = [ext.lower() for ext in extensions]
    current_ext = file_path.suffix.lower()
    
    if current_ext not in allowed_exts:
        return {"valid": False, "code": "INVALID_EXTENSION"}

    max_size_bytes = max_size_mb * 1024 * 1024
    current_size_bytes = file_path.stat().st_size
    
    if current_size_bytes > max_size_bytes:
        return {"valid": False, "code": "FILE_TOO_LARGE"}

    return {"valid": True, "code": "SUCCESS"}

def is_image_file(filename: str) -> bool:
    _, ext = os.path.splitext(filename)
    return ext.lower() in ALLOWED_IMAGE_EXTENSIONS

def format_cv_profile(data: dict) -> str:
    sections = []

    pi = data.get("personal_information") or {}
    name = pi.get("full_name") or "UNKNOWN"
    sections.append(f"# {name.upper()}")

    contacts = []
    if pi.get("email"):     contacts.append(f"{pi['email']}")
    if pi.get("phone"):     contacts.append(f"{pi['phone']}")
    if pi.get("location"):  contacts.append(f"{pi['location']}")
    if pi.get("linkedin"):  contacts.append(f"[LinkedIn]({pi['linkedin']})")
    if pi.get("github"):    contacts.append(f"[GitHub]({pi['github']})")
    if pi.get("portfolio"): contacts.append(f"[Portfolio]({pi['portfolio']})")
    if contacts:
        sections.append(" · ".join(contacts))

    if summary := data.get("professional_summary"):
        sections.append("## Professional Summary")
        sections.append(summary)

    education = data.get("education") or []
    if education:
        sections.append("## Education")
        for edu in education:
            degree      = edu.get("degree") or ""
            field       = edu.get("field_of_study") or ""
            institution = edu.get("institution") or ""
            start       = edu.get("start_year") or ""
            end         = edu.get("end_year") or ""
            gpa         = edu.get("gpa")

            title = " in ".join(filter(None, [degree, field]))
            period = " – ".join(filter(None, [start, end]))
            header = " · ".join(filter(None, [institution, period]))

            sections.append(f"**{title}**  \n{header}")
            if gpa:
                sections.append(f"- GPA: {gpa}")

    work_list = data.get("work_experience") or []
    if work_list:
        sections.append("## Work Experience")
        for job in work_list:
            position  = job.get("position") or ""
            company   = job.get("company") or ""
            location  = job.get("location") or ""
            start     = job.get("start_date") or ""
            end       = job.get("end_date") or ""
            duties    = job.get("responsibilities") or []

            period = " – ".join(filter(None, [start, end]))
            meta   = " · ".join(filter(None, [company, location, period]))

            sections.append(f"**{position}**  \n{meta}")
            for duty in duties:
                sections.append(f"- {duty}")

    projects = data.get("projects") or []
    if projects:
        sections.append("## Projects")
        for proj in projects:
            name_p  = proj.get("name") or "Unnamed Project"
            start   = proj.get("start_date") or ""
            end     = proj.get("end_date") or ""
            techs   = proj.get("technologies") or []
            descs   = proj.get("description") or []

            period = " – ".join(filter(None, [start, end]))
            header = f"**{name_p}**" + (f" · {period}" if period else "")
            sections.append(header)

            if techs:
                sections.append(f"`{'` · `'.join(techs)}`")
            for desc in descs:
                sections.append(f"- {desc}")

    skills = data.get("skills") or {}
    if skills:
        sections.append("## Skills")
        skill_map = {
            "Programming Languages":    skills.get("programming_languages"),
            "Frameworks & Libraries":   skills.get("frameworks_and_libraries"),
        }
        for label, items in skill_map.items():
            if items:
                sections.append(f"**{label}:** {', '.join(items)}")

    research_fields     = data.get("research_fields") or []
    research_directions = data.get("research_directions") or []
    research_themes     = data.get("research_themes") or []

    if any([research_fields, research_directions, research_themes]):
        sections.append("## Research")
        if research_fields:
            sections.append("**Fields**")
            sections.extend([f"- {f}" for f in research_fields])
        if research_directions:
            sections.append("**Directions**")
            sections.extend([f"- {d}" for d in research_directions])
        if research_themes:
            sections.append("**Themes**")
            sections.extend([f"- {t}" for t in research_themes])

    articles = data.get("articles") or []
    if articles:
        sections.append("## Publications")
        for a in articles:
            title = a.get("title") or "Untitled"
            venue = a.get("venue") or "Unknown venue"
            link  = a.get("link")
            title_md = f"[{title}]({link})" if link else title
            sections.append(f"- {title_md} — *{venue}*")

    return "\n\n".join(sections)

from bs4 import BeautifulSoup, Tag, NavigableString

def get_selector(el: Tag) -> str:
    if el.get("id"):
        return f"#{el.get('id')}"
    elif el.get("class"):
        # Ensure classes are joined correctly
        classes = el.get("class")
        if isinstance(classes, list):
            return "." + ".".join(classes)
        return f".{classes}"
    elif el.get("name"):
        return f"{el.name}[name='{el.get('name')}']"
    else:
        return el.name

def traverse_node(node, ordered_list: list):
    for child in node.children:
        # 1. TEXT NODE
        if isinstance(child, NavigableString):
            text = child.strip()
            if text:
                ordered_list.append({
                    "type": "text",
                    "value": text
                })
                
        # 2. ELEMENT NODE
        elif isinstance(child, Tag):
            tag_name = child.name

            if child.get("hidden") is not None or (child.get("style") and "display: none" in child.get("style").lower()):
                continue

            # BUTTON
            if tag_name == "button":
                text = child.get_text(separator=" ", strip=True) 
                is_disabled = child.has_attr("disabled")
                
                ordered_list.append({
                    "type": "button",
                    "text": text,
                    "selector": get_selector(child),
                    **({"disabled": True} if is_disabled else {})
                })
                continue 

            # INPUT
            elif tag_name == "input":
                input_type = child.get("type", "").lower()
                placeholder = child.get("placeholder", "")
                value = child.get("value", "")
                is_disabled = child.has_attr("disabled")
                is_readonly = child.has_attr("readonly")

                if input_type == "hidden":
                    continue

                if input_type in ["submit", "button"]:
                    ordered_list.append({
                        "type": "button",
                        "text": value or placeholder, 
                        "selector": get_selector(child),
                        **({"disabled": True} if is_disabled else {})
                    })
                else:
                    item = {
                        "type": "input",
                        "placeholder": placeholder,
                        "value": value,
                        "selector": get_selector(child)
                    }
                    if is_disabled: item["disabled"] = True
                    if is_readonly: item["readonly"] = True
                    if input_type in ["checkbox", "radio"] and child.has_attr("checked"):
                        item["checked"] = True
                    
                    ordered_list.append(item)
                continue

            # TEXTAREA 
            elif tag_name == "textarea":
                placeholder = child.get("placeholder", "")
                value = child.get_text(strip=True) 
                is_disabled = child.has_attr("disabled")
                is_readonly = child.has_attr("readonly")

                item = {
                    "type": "textarea",
                    "placeholder": placeholder,
                    "value": value,
                    "selector": get_selector(child)
                }
                if is_disabled: item["disabled"] = True
                if is_readonly: item["readonly"] = True

                ordered_list.append(item)
                continue

            # LINK
            elif tag_name == "a":
                text = child.get_text(separator=" ", strip=True)
                if text:
                    ordered_list.append({
                        "type": "link",
                        "text": text,
                        "selector": get_selector(child)
                    })
                continue

            traverse_node(child, ordered_list)

def extract_ordered_elements(html: str) -> list:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "meta", "link", "svg"]):
        tag.decompose()
        
    ordered = []
    root_node = soup.body if soup.body else soup
    traverse_node(root_node, ordered)

    return ordered

def calculate_token_count(usage_metadata):
    if not usage_metadata:
        return 0

    try:
        caches_token = 0
        if getattr(usage_metadata, 'cache_tokens_details', None):
            caches_token = getattr(usage_metadata.cache_tokens_details[0], 'token_count', 0)

        candidates_token = getattr(usage_metadata, 'candidates_token_count', 0)
        thoughts_token = getattr(usage_metadata, 'thoughts_token_count', 0)
        prompt_token = getattr(usage_metadata, 'prompt_token_count', 0)

        output_token = candidates_token + thoughts_token
        input_token = prompt_token - caches_token

        input_token = max(0, input_token)

        total_token_count = int(caches_token / 60 + input_token / 6 + output_token) 

        return total_token_count

    except Exception as e:
        return 0