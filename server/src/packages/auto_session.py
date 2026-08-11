import numpy as np
from typing import List
import time

from google.genai import types

from packages.utils import EMBEDDING_MODEL_NAME, Logger, genai_client, SESSION_TITLE_GIVER, calculate_token_count

logger = Logger()

MODEL = "gemini-3-flash-preview"

def get_batch_embeddings(text_list: List[str]):
    if not text_list:
        logger.warning("Recieve empty input")
        return []
        
    try:
        start_time = time.time()
        
        # Fallback to local approximation since API count_tokens does not support embedding models here
        token_count = sum(int(len(t) / 4) for t in text_list)

        response = genai_client.models.embed_content(
            model=EMBEDDING_MODEL_NAME,
            contents=text_list,
            config=types.EmbedContentConfig(task_type="CLUSTERING") 
        )
        
        latency = time.time() - start_time
        logger.info(f"========== EVALUATION LOG ==========")
        logger.info(f"Feature: Clustering Embeddings")
        logger.info(f"Tokens: {token_count}")
        logger.info(f"Latency: {latency:.2f}s")
        logger.info(f"====================================")
        
        return [np.array(e.values) for e in response.embeddings]
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise e

async def generate_session_title(paper_titles: List[str], model = MODEL) -> str:
    
    paper_list_str = "\n".join([f"- {t}" for t in paper_titles])
    start_time = time.time()
    
    try:
        response = await genai_client.aio.models.generate_content(
            model=model,
            contents=f"Papers in Session:\n {paper_list_str}",
            config=types.GenerateContentConfig(
                system_instruction=SESSION_TITLE_GIVER,
            )
        )
        
        latency = time.time() - start_time
        token_count = calculate_token_count(response.usage_metadata)
        logger.info(f"========== EVALUATION LOG ==========")
        logger.info(f"Feature: Session Naming (Clustering)")
        logger.info(f"Tokens: {token_count}")
        logger.info(f"Latency: {latency:.2f}s")
        logger.info(f"====================================")
        
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Naming error: {e}")
        return "General Session (AI Error)"