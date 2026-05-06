from fastapi import APIRouter, HTTPException
from packages.schema import NLPAnalysisResult
from packages.utils import Logger, supabase_client, language_client
from packages.reviews_analysis import analyze_entities, analyze_sentiment, calculate_depth_score

logger = Logger()
router = APIRouter(tags=["reviews"])

@router.post("/reviews/{review_id}/analyze-nlp", response_model=NLPAnalysisResult)
async def analyze_review_nlp(review_id: int):
    if not language_client:
        raise HTTPException(status_code=500, detail="Google Language Client not configured.")

    try:
        res = supabase_client.table("reviews").select("comments").eq("review_id", review_id).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Review ID not found")
        
        text_content = res.data[0].get("comments", "")
        
        if not text_content or len(text_content.strip()) < 5:
             raise HTTPException(status_code=400, detail="Comment content is too short or empty.")
        
        sentiments = analyze_sentiment(text_content)
        entities = analyze_entities(text_content)        
        depth_score = calculate_depth_score(text_content, sentiments, entities)

        sentiment_data = {
            "score": round(sentiments.score, 3),       
            "magnitude": round(sentiments.magnitude,3),
            "entity_count": len(entities)     
        }

        upsert_data = {
            "review_id": review_id,
            "ai_depth_score": depth_score,
            "ai_sentiment": sentiment_data, 
        }

        existing = supabase_client.table("review_ai_metrics").select("metric_id").eq("review_id", review_id).execute()
        
        if existing.data:
            metric_id = existing.data[0]['metric_id']
            supabase_client.table("review_ai_metrics").update(upsert_data).eq("metric_id", metric_id).execute()
        else:
            supabase_client.table("review_ai_metrics").insert(upsert_data).execute()


        return {
            "review_id": review_id,
            "depth_score": depth_score,
            "sentiment_score": sentiments.score,
            "sentiment_magnitude": sentiments.magnitude,
            "entity_count": len(entities),
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"NLP Analysis Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
