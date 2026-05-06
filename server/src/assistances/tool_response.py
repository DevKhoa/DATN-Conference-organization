from typing import TypedDict, Optional, Literal, Any, Dict, List
import json

#===================== FUNCTION RESPONDE TEMPLATE ================================#

class ToolResponseDict(TypedDict, total=False):
    function_name : str 
    status: Literal["success", "error"]
    content_type: Literal["text", "json", "image", "audio", "other"]
    output: Optional[str]
    error: Optional[str]
    urls: Optional[List[str]]

class ToolResponse:
    """Factory for ToolResponseDict."""

    @staticmethod
    def success_response(
        function_name: str,
        output: str,
        content_type: str = "text",
        urls : Optional[List] = None
    ) -> ToolResponseDict:
        if not urls:
            return ToolResponseDict(
            function_name=function_name,
            status="success",
            content_type=content_type,
            output=output,
        )
        else:
            return ToolResponseDict(
                function_name=function_name,
                status="success",
                content_type=content_type,
                output=output,
                urls=urls
            )
    
    @staticmethod
    def error_response(
        function_name: str,
        error : str,
        content_type: str = "text",
    ) -> ToolResponseDict:
        return ToolResponseDict(
            function_name=function_name,
            status="error",
            content_type=content_type,
            error=error,
        )

    @staticmethod
    def is_success(response: ToolResponseDict) -> bool:
        return response.get("status") == "success"

    @staticmethod
    def is_error(response: ToolResponseDict) -> bool:
        return response.get("status") == "error"

    @staticmethod
    def model_dump(response: ToolResponseDict) -> Dict[str, Any]:
        return dict(response)

    @staticmethod
    def model_dump_json(response: ToolResponseDict) -> str:
        return json.dumps(response, ensure_ascii=False, indent=2)