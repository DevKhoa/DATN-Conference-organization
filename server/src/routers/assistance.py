import json
from fastapi.responses import StreamingResponse

from fastapi import APIRouter, HTTPException, Query, Path
from packages.utils import Logger, supabase_client
from fastapi.responses import JSONResponse
from packages.schema import SendMessagePayload

from assistances.agent import create_agent
from assistances.agent_tools import user_id_var, tab_id_var
from packages.utils import supabase_client, calculate_token_count
from packages.auto_conversation import generate_conversation_title, get_local_memory


logger = Logger()


router = APIRouter(tags=["assistance"])

MIN_CHAT_TOKEN_BUFFER = 300


def _get_active_subscription_or_raise(user_id: int):
    subscription_res = supabase_client.rpc(
        "admin_get_user_subscription",
        {"p_user_id": user_id},
    ).execute()

    subscription = (subscription_res.data or [None])[0]
    if (
        not subscription
        or not subscription.get("is_valid")
        or subscription.get("status") not in ["ACTIVE", "CANCELED"]
    ):
        raise HTTPException(status_code=403, detail="You need a valid subscription to chat.")

    tokens_remaining = int(subscription.get("tokens_remaining") or 0)
    if tokens_remaining < MIN_CHAT_TOKEN_BUFFER:
        raise HTTPException(
            status_code=403,
            detail=f"Your subscription needs at least {MIN_CHAT_TOKEN_BUFFER} tokens to start a chat.",
        )

    return subscription


def _get_user_role(user_id: int) -> str:
    """Query the highest-priority role name for the given user. Falls back to 'USER' on error."""
    try:
        res = supabase_client.table("user_roles") \
            .select("roles(role_name)") \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()
        if res.data:
            return res.data[0]["roles"]["role_name"]
    except Exception:
        pass
    return "USER"


@router.post("/{user_id}/send-message")
async def send_message_endpoint(
    payload: SendMessagePayload,
    user_id: int = Path(..., description="User ID")
):
    api_response = {
        "status": {},
        "parts": {},
        "metadata": {}
    }
    
    local_memory = []
    conversation_data = {"user_id": user_id}
    
    # Set context variables for tools
    user_id_var.set(user_id)
    if payload.tab_id:
        tab_id_var.set(payload.tab_id)

    user_role = _get_user_role(user_id)
    agent = create_agent(user_id=user_id, user_role=user_role)

    try:
        _get_active_subscription_or_raise(user_id)

        # 1. Get conversation information
        if not payload.parent_id:
            # Create new conversation
            conv_title = await generate_conversation_title(payload.content)
            conversation_data['title'] = conv_title
            api_response['metadata']['title'] = conv_title
            
            supabase_response = supabase_client.table("conversations").insert(conversation_data).execute()
            
            if not supabase_response.data:
                raise ValueError("Error uploading data to supabase")
                
            conv_id = supabase_response.data[0]['conv_id']
            api_response['metadata']['conv_id'] = conv_id
            
        else:
            # Load existing conversation
            supabase_response = supabase_client.table("messages").select("conv_id").eq("message_id", payload.parent_id).execute()
            
            if not supabase_response.data:
                raise ValueError(f"Could not find message with parent_id: {payload.parent_id}")
                
            conv_id = supabase_response.data[0]['conv_id']
            api_response['metadata']['conv_id'] = conv_id
            
            # Load memory
            local_memory = get_local_memory(message_id=payload.parent_id)
        
        # 2. Upload Human Message
        user_message_data = {
            'conv_id': conv_id,
            'role': 'user',
            'content': payload.content,
            'parent_id': payload.parent_id,
            'tokens_count': 0
        }
        
        user_msg_response = supabase_client.table("messages").insert(user_message_data).execute()
        
        if not user_msg_response.data:
            raise ValueError("Error uploading data to supabase")
            
        current_parent_id = user_msg_response.data[0]['message_id']
        api_response['metadata']['parent_id'] = current_parent_id

        # 3. Generate response
        genai_response = await agent.send_message(payload.content, local_memory=local_memory)
        
        model_message = genai_response.text
        usage_data = genai_response.usage_metadata
        tokens_count = calculate_token_count(usage_data) if usage_data else 0

        # 4. Upload AI message
        model_response_data = {
            "conv_id": conv_id,
            "role": "model",
            "content": model_message,
            "parent_id": current_parent_id,
            "tokens_count": tokens_count,
        }
        
        model_msg_response = supabase_client.table("messages").insert(model_response_data).execute()
        
        if not model_msg_response.data:
            raise ValueError("Error uploading data to supabase")
            
        message_id = model_msg_response.data[0]['message_id']
        created_at = model_msg_response.data[0]['created_at']
        
        # 5. Form BE API response
        api_response['metadata']['message_id'] = message_id
        api_response['metadata']['created_at'] = created_at
        api_response['metadata']['tokens_count'] = tokens_count

        api_response['parts']['type'] = 'text'
        api_response['parts']['content'] = model_message

        api_response['status']['status_code'] = 200
        api_response['status']['is_finish'] = True 
        api_response['status']['finish_reason'] = "stop"
        
        return api_response

    except Exception as e:
        error_message = str(e)
        logger.error(f"Error in send-message: {error_message}", exc_info=True)
        
        api_response['status']['status_code'] = 500
        api_response['status']['is_finish'] = True
        api_response['status']['finish_reason'] = error_message
        
        api_response['parts']['type'] = 'error'
        api_response['parts']['content'] = ""
        
        return JSONResponse(status_code=500, content=api_response)
    
@router.post("/{user_id}/send-message-stream")
async def send_message_sse_stream_endpoint(
    payload: SendMessagePayload,
    user_id: int = Path(..., description="User ID")
):
    conversation_data = {"user_id": user_id}
    local_memory = []

    finish_data = {
        "status": {"status_code": 200, "is_finish": False, "finish_reason": "stop"},
        "parts": {"type": "finish", "content": ""},
        "metadata": {}
    }
    
    user_id_var.set(user_id)
    if payload.tab_id:
        tab_id_var.set(payload.tab_id)

    user_role = _get_user_role(user_id)
    agent = create_agent(user_id=user_id, user_role=user_role)

    try:
        _get_active_subscription_or_raise(user_id)

        # Get conversation id
        if not payload.parent_id:
            conv_title = await generate_conversation_title(payload.content)
            conversation_data['title'] = conv_title
            finish_data['metadata']['title'] = conv_title

            supabase_response = supabase_client.table("conversations").insert(conversation_data).execute()
            
            if not supabase_response.data:
                raise ValueError("Error uploading data to supabase")
            
            conv_id = supabase_response.data[0]['conv_id']
            finish_data['metadata']['conv_id'] = conv_id
            
        else:
            # Load existing conversation
            supabase_response = supabase_client.table("messages").select("conv_id").eq("message_id", payload.parent_id).execute()
            
            if not supabase_response.data:
                raise ValueError("Parent message not found")

            conv_id = supabase_response.data[0]['conv_id']
            finish_data['metadata']['conv_id'] = conv_id

            local_memory = get_local_memory(message_id=payload.parent_id)
            
        # Upload user message
        user_msg_data = {
            'conv_id': conv_id,
            'role': 'user',
            'content': payload.content,
            'parent_id': payload.parent_id,
            'tokens_count': 0
        }

        user_msg_response = supabase_client.table("messages").insert(user_msg_data).execute()

        if not user_msg_response.data:
            raise ValueError("Error uploading data to supabase")

        current_parent_id = user_msg_response.data[0]['message_id']
        finish_data['metadata']['parent_id'] = current_parent_id

    except Exception as e:
        error_message = str(e)
        logger.error(f"Pre-stream setup error: {error_message}")

        finish_data['status']['status_code'] = 500
        finish_data['status']['is_finish'] = True
        finish_data['status']['finish_reason'] = error_message
        
        finish_data['parts']['type'] = 'error'
        finish_data['parts']['content'] = ""

        def error_generator():
            yield f"data: {json.dumps(finish_data)}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")

    async def event_generator():
        import time
        start_time = time.time()
        depth = 0
        full_response = ""
        token_count = 0
        
        try:
            async for event in agent.send_message_sse_stream(payload.content, local_memory=local_memory):
                
                if event["type"] == "text_stream":
                    chunk = event["content"]
                    text_chunk = chunk.text if hasattr(chunk, 'text') else ""
                    if text_chunk:
                        full_response += text_chunk
                    
                    sse_data = {
                        "status": {"status_code": 200, "is_finish": False},
                        "parts": {"type": "text", "content": text_chunk}
                    }
                    # Convert dict to JSON string with 'data: ' prefix
                    yield f"data: {json.dumps(sse_data)}\n\n"

                elif event["type"] == "tool_call":
                    depth += 1
                    fc = event["content"]
                    
                    sse_data = {
                        "status": {"status_code": 200, "is_finish": False},
                        "parts": {"type": "tool_call", "content": {"function_name": fc.name, "args": dict(fc.args) if hasattr(fc, 'args') else {}}}
                    }
                    yield f"data: {json.dumps(sse_data)}\n\n"

                elif event["type"] == "tool_result":
                    result = event["content"]
                    
                    sse_data = {
                        "status": {"status_code": 200, "is_finish": False},
                        "parts": {"type": "tool_result", "content": result}
                    }
                    yield f"data: {json.dumps(sse_data)}\n\n"
                    
                elif event["type"] == "usage_metadata":
                    usage_data = event["content"]
                    new_count = calculate_token_count(usage_data)
                    if new_count > 0:
                        token_count = new_count

            latency = time.time() - start_time
            logger.info(f"========== EVALUATION LOG ==========")
            logger.info(f"Query: {payload.content}")
            logger.info(f"Depth (Tool Calls): {depth}")
            logger.info(f"Tokens: {token_count}")
            logger.info(f"Latency: {latency:.2f}s")
            logger.info(f"====================================")

            # Upload AI message data
            model_msg_data = {
                "conv_id": conv_id,
                "role": "model",
                "content": full_response,
                "parent_id": current_parent_id,
                "tokens_count": token_count,
            }
            db_res = supabase_client.table("messages").insert(model_msg_data).execute()
            
            message_id = db_res.data[0]['message_id']
            created_at = db_res.data[0]['created_at']

            finish_data['metadata']['message_id'] = message_id
            finish_data['metadata']['created_at'] = created_at
            finish_data['metadata']['tokens_count'] = token_count
            
            finish_data['status']['is_finish'] = True 
            
            yield f"data: {json.dumps(finish_data)}\n\n"

        except Exception as e:
            error_message = str(e)
            logger.error(f"Stream error: {error_message}")

            finish_data['status']['status_code'] = 500
            finish_data['status']['is_finish'] = True
            finish_data['status']['finish_reason'] = error_message
            
            finish_data['parts']['type'] = 'error'
            finish_data['parts']['content'] = ""

            yield f"data: {json.dumps(finish_data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/{user_id}/conversations")
async def get_conversations(user_id: int = Path(..., description="User ID")):
    try:
        response = supabase_client.table("conversations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return JSONResponse(status_code=200, content={"conversations": response.data})
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/{user_id}/conversations/{conv_id}/messages")
async def get_messages(
    user_id: int = Path(..., description="User ID"),
    conv_id: int = Path(..., description="Conversation ID"),
    limit: int = 10,
    offset: int = 0
):
    try:
        # First verify the conversation belongs to the user
        conv_check = supabase_client.table("conversations").select("user_id").eq("conv_id", conv_id).execute()
        if not conv_check.data or conv_check.data[0]['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        response = supabase_client.table("messages").select("*").eq("conv_id", conv_id).order("created_at", desc=True).limit(limit).offset(offset).execute()
        return JSONResponse(status_code=200, content={"messages": response.data})
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
