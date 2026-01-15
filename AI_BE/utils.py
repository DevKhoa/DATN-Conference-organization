import os
import sys
import logging
import re
from dotenv import load_dotenv

from typing import List

from google import genai
from google.cloud import language_v2
from google.cloud import storage

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from supabase.client import create_client


#======================================== CREDENTIALS ========================================#

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

logger = Logger()
#======================================== CONSTANTS ========================================#

USER_ID = "agent"
MODEL = 'gemini-2.5-flash'

EMBEDDING_MODEL_NAME = "gemini-embedding-001"

BUCKET_NAME = "conferences-papers"
FILE_TEMP_DIR = "temp_storage"

CHUNK_SIZE = 1000 
CHUNK_OVERLAP = 200
VECTOR_DIMENSION = 1536

genai_client = genai.Client()
language_client = language_v2.LanguageServiceClient()
storage_client = storage.Client()

embedding_model = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL_NAME, output_dimensionality=VECTOR_DIMENSION)
supabase_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

with open("Prompts/session_title_giver.txt", 'r') as f:
    SESSION_TITLE_GIVER = f.read()

with open("Prompts/format_reviewer.txt", 'r') as f:
    FORMAT_REVIEWER = f.read()

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

