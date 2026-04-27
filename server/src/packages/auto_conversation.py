
from google.genai import types
from packages.utils import Logger, genai_client, supabase_client, CONV_TITLE_GIVER

logger = Logger()

MODEL ="gemini-3-flash-preview"

async def generate_conversation_title(chat_messages: str, model = MODEL)-> str: 
    try:
        response = await genai_client.aio.models.generate_content(
            model=model,
            contents=f"User chat message: {chat_messages}",
            config=types.GenerateContentConfig(
                system_instruction=CONV_TITLE_GIVER,
            )
        )
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Naming error: {e}")
        return "General Chat Session"


def get_local_memory(message_id: int, max_messages: int = 10):
    supabase_response = supabase_client.rpc('get_conversation_memory', {"start_message_id": message_id, "max_messages": max_messages}).execute()
    logger.info(f"Supabase_response: {supabase_response.model_dump_json()}")

    if supabase_response.data:
        messages_data = supabase_response.data
        local_memory = []
        for message in messages_data:
            local_memory.append(types.Content(role=message['role'], parts=[types.Part.from_text(text=message['content'])]))
        return local_memory
    else:
        logger.error(f"Error fetching conversation memory for message {message_id}")
        return []
        