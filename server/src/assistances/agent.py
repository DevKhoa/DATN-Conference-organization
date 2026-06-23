from typing import List, AsyncGenerator, Any

import inspect

from google.genai import types

from assistances.agent_tools import make_query, navigate, click, fill, current_tab, fill_enter, fill_datetime
from packages.utils import Logger, genai_client, get_assistance_instruction

logger = Logger()

MODEL = "gemini-3-flash-preview"
MAX_OUTPUT_TOKEN = 10240
MAX_DEPTH = 10
TOOLS = [make_query, navigate, click, fill, current_tab, fill_datetime, fill_enter]

class RootAgent:
    def __init__(self, client=genai_client, model=MODEL, max_token=MAX_OUTPUT_TOKEN, tools=TOOLS, instruction=None):
        self.client = client 
        self.model = model 
        self.max_token = max_token
        self.tools = tools 
        self.instruction = instruction if instruction is not None else get_assistance_instruction()
        self.logger = Logger()
        
    async def _execute_tool(self, name: str, args: dict) -> dict:
        """Helper method to dynamically find and execute a tool from self.tools."""
        for tool_func in self.tools:
            if tool_func.__name__ == name:
                try:
                    # Check if the tool is an async function
                    if inspect.iscoroutinefunction(tool_func):
                        return await tool_func(**args)
                    else:
                        return tool_func(**args)
                except Exception as e:
                    self.logger.error(f"Error executing tool {name}: {str(e)}")
                    return {"error": str(e)}
        return {"error": f"Tool '{name}' not found."}

    async def send_message(self, message: str, local_memory: List[types.Content] = None, global_memory=None) -> types.GenerateContentResponse:
        """
        Main function to send request to the agent, perform multiple action and return responses once
        """
        self.logger.info(f"Received request: {message}")
        config = types.GenerateContentConfig(
            system_instruction=self.instruction,
            tools=self.tools,
        )
        contents = list(local_memory) if local_memory else []
        contents.append(types.Content(role='user', parts=[types.Part.from_text(text=message)]))

        return await self.client.aio.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )

    async def send_message_sse(self, message: str, local_memory: List[types.Content] = None, global_memory=None) -> AsyncGenerator[dict[str, Any], None]:
        """
        Main function to send request to the agent, perform multiple action and return events one by one
        """
        self.logger.info(f"Received stream event request: {message}")
        
        config = types.GenerateContentConfig(
            system_instruction=self.instruction,
            tools=self.tools,
            automatic_function_calling= types.AutomaticFunctionCallingConfig(disable=True)
        )

        contents = list(local_memory) if local_memory else []
        contents.append(types.Content(role='user', parts=[types.Part.from_text(text=message)]))

        turn_count = 1
        while True:
            
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )

            if response.text:
                yield {"type": "text_stream", "content": response}

            if not response.candidates:
                break

            model_content = response.candidates[0].content
            function_calls = [part.function_call for part in model_content.parts if part.function_call]
            
            if not function_calls:
                break
                
            contents.append(model_content)
            
            tool_responses_parts = []
            for fc in function_calls:
                yield{"type": "tool_call", "content": fc} 
                result = await self._execute_tool(fc.name, fc.args)
                yield {"type": "tool_result", "content": result}
                tool_responses_parts.append(
                    types.Part.from_function_response(
                        name=fc.name,
                        response=result,
                    )
                )
                
            contents.append(types.Content(role='user', parts=tool_responses_parts))
            turn_count += 1

            if turn_count >= MAX_DEPTH:
                yield {"type": "FINISH", "content": "Maximum depth reached"}
                break

    async def send_message_sse_stream(self, message: str, local_memory: List[types.Content] = None, global_memory=None) -> AsyncGenerator[dict[str, Any], None]:
        """
        Main function to send request to the agent, perform multiple action and stream actions
        """

        self.logger.info(f"Received stream event request: {message}")
        
        config = types.GenerateContentConfig(
            system_instruction=self.instruction,
            tools=self.tools,
            automatic_function_calling= types.AutomaticFunctionCallingConfig(disable=True)
        )

        contents = list(local_memory) if local_memory else []
        contents.append(types.Content(role='user', parts=[types.Part.from_text(text=message)]))

        turn_count = 1
        while True:
            
            response_stream = await self.client.aio.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=config,
            )

            current_text = ""
            fc_states = {}

            async for chunk in response_stream:
                logger.info(f"Recieved chunk: {chunk.model_dump_json()}")

                if chunk.text:
                    current_text += chunk.text
                    yield {"type": "text_stream", "content": chunk}

                if chunk.usage_metadata:
                    yield {"type": "usage_metadata", "content": chunk.usage_metadata}  # separate type!
                
                if chunk.candidates and chunk.candidates[0].content.parts:
                    for part in chunk.candidates[0].content.parts:
                        if part.function_call:
                            fc_id = part.function_call.id
                            if fc_id not in fc_states:
                                fc_states[fc_id] = part
                            else:
                                fc_states[fc_id].function_call.args = part.function_call.args

            current_fc_parts = list(fc_states.values())
            
            model_turn_parts = []
            if current_text:
                model_turn_parts.append(types.Part.from_text(text=current_text))
            
            for part in current_fc_parts:
                model_turn_parts.append(part)
                
                yield {"type": "tool_call", "content": part.function_call}
                
            if not current_fc_parts:
                break
                
            contents.append(types.Content(role="model", parts=model_turn_parts))
            
            tool_responses_parts = []
            for part in current_fc_parts:
                fc = part.function_call
                
                result = await self._execute_tool(fc.name, fc.args)
                
                yield {"type": "tool_result", "content": result}
                
                tool_responses_parts.append(
                    types.Part.from_function_response(
                        name=fc.name,
                        response=result,
                    )
                )
                
            contents.append(types.Content(role='user', parts=tool_responses_parts))
            turn_count += 1

            if turn_count >= MAX_DEPTH:
                yield {"type": "FINISH", "content": "Maximum depth reached"}


agent = RootAgent()