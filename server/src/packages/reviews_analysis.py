from packages.utils import Logger, language_client
from google.cloud import language_v2

logger = Logger()

constructive_keywords = [
    "should", "could", "would benefit", "suggest", "recommend",
    "improve", "strengthen", "clarify", "extend", "revise",
    "missing", "lack", "insufficient", "incomplete",
    "better", "instead", "alternative", "consider",
    "address", "add", "include", "provide", "explore",
    "theoretical", "formal", "proof", "derivation",
    "complexity", "computational cost", "scalability",
    "optimization", "gradient", "convergence",
    "architecture", "representation", "expressive power",
    "assumption", "limitation", "failure case"
]

def analyze_sentiment(text_content):
    try:
        document = {
            "content": text_content,
            "type_": language_v2.Document.Type.PLAIN_TEXT,
        }
        request = {
            "document": document,
            "encoding_type": language_v2.EncodingType.UTF8
        }

        response = language_client.analyze_sentiment(request)
        logger.debug(f"Received sentiment raw response: {response}")

        return response.document_sentiment

    except Exception as e:
        logger.error(f"Error{e}",)
        return None

def analyze_entities(text_content):
    try:
        document = {
            "content": text_content,
            "type_": language_v2.Document.Type.PLAIN_TEXT,
        }
        request = {
            "document": document,
            "encoding_type": language_v2.EncodingType.UTF8
        }

        response = language_client.analyze_entities(request)
        logger.debug(f"Received entity response: {response}")

        return response.entities

    except Exception as e:
        logger.error(f"Error{e}",)
        return []

def calculate_depth_score(text_content, sentiments, entities):
    try:
        # Guard clauses
        if sentiments is None:
            logger.warning("Sentiment is None, defaulting magnitude to 0")
            magnitude = 0
        else:
            magnitude = sentiments.magnitude

        volume_score = min(magnitude * 2, 10)  # 30%

        entities_count = len(entities) if entities else 0
        spec_score = min(entities_count * 1.0, 10)  # 30%

        found_keywords = sum(
            1 for word in constructive_keywords
            if word in text_content.lower()
        )
        cons_score = min(found_keywords, 10)

        final_depth = volume_score * 0.3 + spec_score * 0.3 + cons_score * 0.4

        return final_depth

    except Exception as e:
        logger.error(f"Error{e}",)
        return 0.0