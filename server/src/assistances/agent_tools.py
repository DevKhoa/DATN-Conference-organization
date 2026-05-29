import json
import re
import httpx
import contextvars

from packages.utils import Logger, supabase_client
from assistances.tool_response import ToolResponse
import os

from dotenv import load_dotenv
load_dotenv()

logger = Logger()

# Context variables to hold user_id and tab_id for tools that need them without explicit arguments
user_id_var = contextvars.ContextVar("user_id", default=None)
tab_id_var = contextvars.ContextVar("tab_id", default=None)

BASE_URL = f"{os.environ.get("API_BASE_URL")}/trigger-action"


def make_query(sql_query: str) -> str:
    """
    Execute SQL to retrieve data from Supabase

    Args:
        sql_query (str): SQL query
    Output:
        Execution status and retrieved data
    """
    function_name = "make_query"
    logger.info(f"Received SQL query: {sql_query}")

    forbidden_pattern = re.compile(r'\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b', re.IGNORECASE)
    if forbidden_pattern.search(sql_query):
        error_msg = "Query rejected: Contains forbidden keywords (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE)."
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name, 
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)

    limit_pattern = re.compile(r'\bLIMIT\b', re.IGNORECASE)
    if not limit_pattern.search(sql_query):
        error_msg = "Query rejected: Missing LIMIT clause. Please add LIMIT to your query."
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name, 
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)

    try:
        if ';' in sql_query:
            sql_query = sql_query.replace(';','')
        response = supabase_client.rpc("exec_sql", {"query": sql_query}).execute()
        
        logger.info(f"Query executed sucessfully: {response.model_dump_json()}")
        data = response.data
        
        output_str = json.dumps(data, ensure_ascii=False, indent=2)
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=output_str,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)

    except Exception as e:
        error_msg = f"Supabase execution error: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)

async def navigate(path: str) -> str:
    """
    Navigates to a specific page or path in the application on the user's browser.
    
    Args:
        path (str): The path to navigate to (e.g. 'papers/10').
    Output:
        json: Execution status, including the current page url and availble elements
    """
    function_name = "navigate"
    user_id = user_id_var.get()
    tab_id = tab_id_var.get()

    if not user_id or not tab_id:
        error_msg = f"Cannot execute {function_name} tool: The tab is missing"
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
        
    url = f"{BASE_URL}/{user_id}/{tab_id}"
    payload = {
        "action": "navigate",
        "path": path
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        res_data = response.json()

        logger.info(res_data)
        
        if res_data.get("status") == "error":
            error_msg = f"Browser error: {res_data.get('message', 'Unknown error')}"
            current_url = res_data.get("url", "unknown url")
            available_ids = res_data.get("available_ids", [])
            error_data = {"error": error_msg, "current_url": current_url, "available_elements": available_ids}
            logger.warning(error_msg)
            response_dict = ToolResponse.error_response(
                function_name=function_name,
                error=error_data,
                content_type="json"
            )
            return ToolResponse.model_dump(response_dict)
        
        current_url = res_data.get("url", "unknown url")
        available_ids = res_data.get("available_ids", [])

        success_data = {"current_url": current_url, "available_elements": available_ids}
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=success_data,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)

    except Exception as e:
        error_msg = f"Error sending navigation command: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    
async def click(target: str) -> str:
    """
    Clicks on a specific valid button or element on this current page using CSS Selectors.

    Args:
        target (str): Target to click (e.g. '#btn-submit').
    Output:
        json: Execution status, including the current page url and availble elements

    """
    function_name = "click"
    user_id = user_id_var.get()
    tab_id = tab_id_var.get()

    if target and not target.startswith("#"):
        target = f"#{target}"

    
    if not user_id or not tab_id:
        error_msg = f"Cannot execute {function_name} tool: The tab is missing"
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    
    url = f"{BASE_URL}/{user_id}/{tab_id}"
    payload = {
        "action": "click",
        "target": target
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        res_data = response.json()
        if res_data.get("status") == "error":
            error_msg = f"Browser error: {res_data.get('message', 'Unknown error')}"
            current_url = res_data.get("url", "unknown url")
            available_ids = res_data.get("available_ids", [])
            error_data = {"error": error_msg, "current_url": current_url, "available_elements": available_ids}
            logger.warning(error_msg)
            response_dict = ToolResponse.error_response(
                function_name=function_name,
                error=error_data,
                content_type="json"
            )
            return ToolResponse.model_dump(response_dict)
        
        current_url = res_data.get("url", "unknown url")
        available_ids = res_data.get("available_ids", [])

        success_data = {"current_url": current_url, "available_elements": available_ids}
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=success_data,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)
        
    except Exception as e:
        error_msg = f"Error sending navigation command: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    

async def fill(target: str, value: str) -> str:
    """
    Fills a form input target with a specific value using CSS Selectors.
    Args:
        target (str): Target to fill (e.g. '#btn-submit').
    Output:
        json: Execution status, including the current page url and availble elements
    """
    function_name = "fill"
    user_id = user_id_var.get()
    tab_id = tab_id_var.get()

    if target and not target.startswith("#"):
        target = f"#{target}"

    if not user_id or not tab_id:
        error_msg = f"Cannot execute {function_name} tool: The tab is missing"
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    
    url = f"{BASE_URL}/{user_id}/{tab_id}"
    payload = {
        "action": "fill",
        "target": target,
        "value": value
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        res_data = response.json()
        if res_data.get("status") == "error":
            error_msg = f"Browser error: {res_data.get('message', 'Unknown error')}"
            current_url = res_data.get("url", "unknown url")
            available_ids = res_data.get("available_ids", [])
            error_data = {"error": error_msg, "current_url": current_url, "available_elements": available_ids}
            logger.warning(error_msg)
            response_dict = ToolResponse.error_response(
                function_name=function_name,
                error=error_data,
                content_type="json"
            )
            return ToolResponse.model_dump(response_dict)
        
        current_url = res_data.get("url", "unknown url")
        available_ids = res_data.get("available_ids", [])

        success_data = {"current_url": current_url, "available_elements": available_ids}
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=success_data,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)
        
    except Exception as e:
        error_msg = f"Error sending navigation command: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)

async def current_tab() -> str:
    """
    Retrieves the current URL, available interactive elements, and cleaned HTML context on the page without performing any action.
    """
    function_name = "current_tab"
    user_id = user_id_var.get()
    tab_id = tab_id_var.get()

    if not user_id or not tab_id:
        error_msg = f"Cannot execute {function_name} tool: The tab is missing"
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    
    url = f"{BASE_URL}/{user_id}/{tab_id}"
    payload = {
        "action": "get_context"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        res_data = response.json()
        if res_data.get("status") == "error":
            error_msg = f"Browser error: {res_data.get('message', 'Unknown error')}"
            current_url = res_data.get("url", "unknown url")
            available_ids = res_data.get("available_ids", [])
            error_data = {"error": error_msg, "current_url": current_url, "available_elements": available_ids}
            logger.warning(error_msg)
            response_dict = ToolResponse.error_response(
                function_name=function_name,
                error=error_data,
                content_type="json"
            )
            return ToolResponse.model_dump(response_dict)
        
        current_url = res_data.get("url", "unknown url")
        available_ids = res_data.get("available_ids", [])
        html = res_data.get("html", "")

        success_data = {"current_url": current_url, "available_elements": available_ids, "html": html}
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=success_data,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)
        
    except Exception as e:
        error_msg = f"Error sending get_context command: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)

async def fill_enter(target: str, value: str) -> str:
    """
    Fills a form input target with a specific value and simulates pressing Enter key using CSS Selectors.
    Args:
        target (str): Target to fill (e.g. '#form-keyword-input').
        value (str): The value to fill into the target.
    Output:
        json: Execution status, including the current page url and availble elements
    """
    function_name = "fill_enter"
    user_id = user_id_var.get()
    tab_id = tab_id_var.get()

    if target and not target.startswith("#"):
        target = f"#{target}"

    if not user_id or not tab_id:
        error_msg = f"Cannot execute {function_name} tool: The tab is missing"
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    
    url = f"{BASE_URL}/{user_id}/{tab_id}"
    payload = {
        "action": "fill_enter",
        "target": target,
        "value": value
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        res_data = response.json()
        if res_data.get("status") == "error":
            error_msg = f"Browser error: {res_data.get('message', 'Unknown error')}"
            current_url = res_data.get("url", "unknown url")
            available_ids = res_data.get("available_ids", [])
            error_data = {"error": error_msg, "current_url": current_url, "available_elements": available_ids}
            logger.warning(error_msg)
            response_dict = ToolResponse.error_response(
                function_name=function_name,
                error=error_data,
                content_type="json"
            )
            return ToolResponse.model_dump(response_dict)
        
        current_url = res_data.get("url", "unknown url")
        available_ids = res_data.get("available_ids", [])

        success_data = {"current_url": current_url, "available_elements": available_ids}
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=success_data,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)
        
    except Exception as e:
        error_msg = f"Error sending fill_enter command: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)

async def fill_datetime(target: str, value: str) -> str:
    """
    Fills a datetime/date form input target with a specific value using CSS Selectors.
    Args:
        target (str): Target to fill (e.g. '#form-start-date').
        value (str): The date/time value to fill (e.g. '2025-12-31').
    Output:
        json: Execution status, including the current page url and availble elements
    """
    function_name = "fill_datetime"
    user_id = user_id_var.get()
    tab_id = tab_id_var.get()

    if target and not target.startswith("#"):
        target = f"#{target}"

    if not user_id or not tab_id:
        error_msg = f"Cannot execute {function_name} tool: The tab is missing"
        logger.warning(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
    
    url = f"{BASE_URL}/{user_id}/{tab_id}"
    payload = {
        "action": "fill_datetime",
        "target": target,
        "value": value
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
        response.raise_for_status()

        res_data = response.json()
        if res_data.get("status") == "error":
            error_msg = f"Browser error: {res_data.get('message', 'Unknown error')}"
            current_url = res_data.get("url", "unknown url")
            available_ids = res_data.get("available_ids", [])
            error_data = {"error": error_msg, "current_url": current_url, "available_elements": available_ids}
            logger.warning(error_msg)
            response_dict = ToolResponse.error_response(
                function_name=function_name,
                error=error_data,
                content_type="json"
            )
            return ToolResponse.model_dump(response_dict)
        
        current_url = res_data.get("url", "unknown url")
        available_ids = res_data.get("available_ids", [])

        success_data = {"current_url": current_url, "available_elements": available_ids}
        
        response_dict = ToolResponse.success_response(
            function_name=function_name,
            output=success_data,
            content_type="json"
        )
        return ToolResponse.model_dump(response_dict)
        
    except Exception as e:
        error_msg = f"Error sending fill_datetime command: {str(e)}"
        logger.error(error_msg)
        response_dict = ToolResponse.error_response(
            function_name=function_name,
            error=error_msg,
            content_type="text"
        )
        return ToolResponse.model_dump(response_dict)
