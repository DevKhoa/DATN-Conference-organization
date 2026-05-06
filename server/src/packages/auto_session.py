import numpy as np
from typing import List

from google.genai import types

from packages.utils import EMBEDDING_MODEL_NAME, Logger, genai_client, SESSION_TITLE_GIVER

logger = Logger()

MODEL = "gemini-3-flash-preview"

def get_batch_embeddings(text_list: List[str]):
    if not text_list:
        logger.warning("Recieve empty input")
        return []
        
    try:
        response = genai_client.models.embed_content(
            model=EMBEDDING_MODEL_NAME,
            contents=text_list,
            config=types.EmbedContentConfig(task_type="CLUSTERING") 
        )
        return [np.array(e.values) for e in response.embeddings]
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise e

async def generate_session_title(paper_titles: List[str], model = MODEL) -> str:
    
    paper_list_str = "\n".join([f"- {t}" for t in paper_titles])
    
    try:
        response = await genai_client.aio.models.generate_content(
            model=model,
            contents=f"Papers in Session:\n {paper_list_str}",
            config=types.GenerateContentConfig(
                system_instruction=SESSION_TITLE_GIVER,
            )
        )
        
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Naming error: {e}")
        return "General Session (AI Error)"