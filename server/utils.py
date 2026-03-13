import os
import sys
import logging
import json
import re
import pathlib


from typing import TypedDict, Optional, Literal, Any, Dict, List, Union

import smtplib
from email.message import EmailMessage

from pypdf import PdfReader

from google import genai
from google.cloud import language_v2
from google.cloud import storage

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from supabase.client import create_client

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

#======================================== CONSTANTS ========================================#

USER_ID = "agent"
MODEL = 'gemini-2.5-flash'

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

genai_client = genai.Client()
language_client = language_v2.LanguageServiceClient()
storage_client = storage.Client()

embedding_model = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL_NAME, output_dimensionality=VECTOR_DIMENSION)
supabase_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

with open("Prompts/session_title_giver.txt", 'r') as f:
    SESSION_TITLE_GIVER = f.read()

with open("Prompts/format_reviewer.txt", 'r') as f:
    FORMAT_REVIEWER = f.read()

with open("Prompts/scholar_retriever.txt", 'r', encoding='utf-8') as f:
    SCHOLAR_PROMPT = f.read()

with open("Prompts/cv_retriever.txt", 'r') as f:
    CV_RETRIEVER = f.read()


#======================================== HELPER FUNCTIONS ========================================#
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

def format_cv_profile(cv: dict) -> str:
    lines = []

    pi = cv["personal_information"]

    lines.append(f"# {pi['full_name']}")
    
    contact = []
    if pi.get("email"):
        contact.append(f"Email: {pi['email']}")
    if pi.get("phone"):
        contact.append(f"Phone: {pi['phone']}")
    if pi.get("location"):
        contact.append(f"Location: {pi['location']}")
    if pi.get("linkedin"):
        contact.append(f"LinkedIn: {pi['linkedin']}")
    if pi.get("github"):
        contact.append(f"GitHub: {pi['github']}")
    if pi.get("portfolio"):
        contact.append(f"Portfolio: {pi['portfolio']}")

    if contact:
        lines.append(" | ".join(contact))

    if cv.get("professional_summary"):
        lines.append("\n## Professional Summary")
        lines.append(cv["professional_summary"])

    if cv["education"]:
        lines.append("\n## Education")
        for edu in cv["education"]:
            line = f"**{edu['institution']}**"
            if edu.get("degree") or edu.get("field_of_study"):
                line += f" — {edu.get('degree', '')} {edu.get('field_of_study', '')}".strip()
            if edu.get("start_year") or edu.get("end_year"):
                line += f" ({edu.get('start_year','')} - {edu.get('end_year','')})"
            lines.append(line)

    if cv["work_experience"]:
        lines.append("\n## Work Experience")
        for job in cv["work_experience"]:
            lines.append(
                f"**{job['position']} — {job['company']}** "
                f"({job.get('start_date','')} - {job.get('end_date','')})"
            )
            for r in job["responsibilities"]:
                lines.append(f"- {r}")
            lines.append("\n")

    skills = cv["skills"]
    if skills["technical_skills"] or skills["soft_skills"]:
        lines.append("\n## Skills")

        if skills["technical_skills"]:
            lines.append("**Technical Skills:**")
            lines.append(", ".join(skills["technical_skills"]))

        if skills["soft_skills"]:
            lines.append("\n**Soft Skills:**")
            lines.append(", ".join(skills["soft_skills"]))

    if cv["projects"]:
        lines.append("\n## Projects")
        for p in cv["projects"]:
            lines.append(f"**{p['name']}**")
            if p.get("description"):
                lines.append(p["description"])
            if p["technologies"]:
                lines.append(f"Technologies: {', '.join(p['technologies'])}")
            lines.append("")

    if cv["certifications"]:
        lines.append("\n## Certifications")
        for c in cv["certifications"]:
            lines.append(f"- {c}")

    # Languages
    if cv["languages"]:
        lines.append("\n## Languages")
        lines.append(", ".join(cv["languages"]))

    # Awards
    if cv["awards"]:
        lines.append("\n## Awards")
        for a in cv["awards"]:
            lines.append(f"- {a}")

    # Additional Info
    if cv.get("additional_information"):
        lines.append("\n## Additional Information")
        lines.append(cv["additional_information"])

    return "\n".join(lines)
