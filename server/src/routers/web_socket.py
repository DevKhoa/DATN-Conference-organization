from packages.utils import Logger
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict
import json
import asyncio
import uuid

logger = Logger()

router = APIRouter(tags=["Web-socket"])

class ActionPayload(BaseModel):
    action: str                 
    path: Optional[str] = None   
    target: Optional[str] = None 
    value: Optional[str] = None 

# Structure: active_connections[user_id][tab_id] = websocket
active_connections: Dict[str, Dict[str, WebSocket]] = {}
pending_actions: Dict[str, asyncio.Future] = {}

@router.websocket("/ws/{user_id}/{tab_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, tab_id: str):
    await websocket.accept()
    
    if user_id not in active_connections:
        active_connections[user_id] = {}
        
    active_connections[user_id][tab_id] = websocket
    print(f"[WS] Client connected: user={user_id}, tab={tab_id}")
    
    try:
        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
                action_id = data.get("action_id")
                if action_id and action_id in pending_actions:
                    # Resolve the future that the /trigger-action is waiting on
                    if not pending_actions[action_id].done():
                        pending_actions[action_id].set_result(data)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        if user_id in active_connections and tab_id in active_connections[user_id]:
            del active_connections[user_id][tab_id]
            if len(active_connections[user_id]) == 0:
                del active_connections[user_id]
        print(f"[WS] Client disconnected: user={user_id}, tab={tab_id}")

@router.post("/trigger-action/{user_id}/{tab_id}")
async def trigger_action(user_id: str, tab_id: str, payload: ActionPayload):
    if user_id in active_connections and tab_id in active_connections[user_id]:
        target_ws = active_connections[user_id][tab_id]
        
        action_id = str(uuid.uuid4())
        message = payload.model_dump(exclude_none=True) if hasattr(payload, 'model_dump') else payload.dict(exclude_none=True)
        message["action_id"] = action_id
        
        future = asyncio.Future()
        pending_actions[action_id] = future
        
        try:
            await target_ws.send_text(json.dumps(message))
            # Wait for FE to respond with max timeout of 7s
            result = await asyncio.wait_for(future, timeout=7.0)
            return {
                "status": "success",
                "url": result.get("url"), 
                "available_ids": result.get("available_ids"),
                "html": result.get("html"),
                "message": result.get("message", "Trigger action successed"),
                "user_roles": result.get("user_roles", [])
            }
        except asyncio.TimeoutError:
            return {"status": "error", "message": "Timeout waiting for frontend response"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            pending_actions.pop(action_id, None)
    else:
        return {"status": "error", "message": "Error trigerring action: Tab is not connected"}
