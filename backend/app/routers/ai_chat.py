# app/routers/ai_chat.py
import os
import re
import requests
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from app.database import get_db
from app.services import find_available_slots, get_teacher_config
from app.model import Student, Lesson

# Fallback setup: Set default API key environment variable if not already set
os.environ["GEMINI_API_KEY"] = "GEMINI_KEY"

router = APIRouter(
    prefix="/api/ai-chat",
    tags=["ai_chat"]
)

# -------------------------------------------------------------
# Pydantic Schemas for Chat Requests
# -------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    studentId: str

# -------------------------------------------------------------
# Google GenAI Tool Definitions
# -------------------------------------------------------------
find_slots_tool = types.FunctionDeclaration(
    name="find_available_slots",
    description="Calculates and returns the best conflict-free lesson time slots for a given student.",
    parameters_json_schema={
        "type": "object", # FIX: Lowercase
        "properties": {
            "student_id": {
                "type": "string", # FIX: Lowercase
                "description": "The unique ID of the student seeking a lesson slot."
            },
            "preferred_days": {
                "type": "array", # FIX: Lowercase
                "items": {"type": "string"}, # FIX: Lowercase
                "description": "List of preferred weekdays, e.g. ['Monday', 'Tuesday']."
            },
            "time_range": {
                "type": "string", # FIX: Lowercase
                "description": "Preferred lesson window: 'morning', 'afternoon', 'evening', or 'all'."
            },
            "expand_mins": {
                "type": "integer", # FIX: Lowercase
                "description": "Optional search hours expansion value in minutes. Defaults to 0."
            },
            "step_mins": {
                "type": "integer", # FIX: Lowercase
                "description": "Granular search stepping value in minutes. Defaults to 15."
            },
            "allow_event_days": {
                "type": "boolean", # FIX: Lowercase
                "description": "If True, matches slots on days when the student has other scheduled events."
            }
        },
        "required": ["student_id", "preferred_days", "time_range"]
    }
)

get_config_tool = types.FunctionDeclaration(
    name="get_teacher_config",
    description="Gets the teacher's current operational hours, working blocks, and custom breaks.",
    parameters_json_schema={
        "type": "object", # FIX: Lowercase
        "properties": {}
    }
)

# -------------------------------------------------------------
# Local Fallback Helper Function (Ollama with Gemma 4 E4B)
# -------------------------------------------------------------
def run_local_ollama_fallback(payload: ChatRequest, db: Session) -> dict:
    """
    Acts as a local offline fallback. Evaluates date/weekday parameters from
    the prompt, invokes Python-level service rules, and queries local Ollama.
    """
    # 1. Fetch current student metadata to brief the model
    student = db.query(Student).filter(Student.student_id == payload.studentId).first()
    student_briefing = ""
    if student:
        override = db.query(Lesson).filter(Lesson.student_id == student.student_id).first()
        current_schedule_str = f"Their regular base lesson is {student.baseWeekday} at {student.baseTime}."
        if override:
            current_schedule_str += f" This week they have a rescheduled makeup lesson on {override.weekday} at {override.time}."
            
        student_briefing = f"""
        You are assisting with scheduling for:
        - Student Name: {student.name}
        - Student ID: {student.student_id}
        - Skill Level: {student.level}
        - Current Schedule: {current_schedule_str}
        """

    system_instruction = f"""You are the Cadenza Music Studio Scheduling Agent.
    You help teachers find the best lesson slots for their students.
    {student_briefing}
    
    CRITICAL BEHAVIOR:
    - If slots are provided in the system context, present ONLY a clean, minimal bulleted list of those calculated times.
    - STRICT FORMATTING COMPLIANCE:
      Present the results exactly like this, replacing the placeholders with the actual times returned by the tool:
      Here are the top options:
      * <First Actual Time (e.g., 3:30 PM)>
      * <Second Actual Time (e.g., 4:00 PM)>
      * <Third Actual Time (e.g., 4:30 PM)>
    - NEVER print the literal words 'Time 1' or keep the brackets. Output only the actual times.
    - NEVER append scheduling reasons, descriptions, or explanation texts to the times. Output ONLY the raw times.
    - If no slots are found, state that clearly and propose checking alternative days of the week in a single short sentence.
    - Keep answers incredibly crisp, simple, and direct. Do not write long-winded conversational greetings or intros."""

    # Check for mentioned weekdays
    day_mapping = {
        "monday": "Monday", "mon": "Monday",
        "tuesday": "Tuesday", "tue": "Tuesday",
        "wednesday": "Wednesday", "wed": "Wednesday",
        "thursday": "Thursday", "thu": "Thursday",
        "friday": "Friday", "fri": "Friday",
        "saturday": "Saturday", "sat": "Saturday",
        "sunday": "Sunday", "sun": "Sunday"
    }

    mentioned_days = []
    for key, val in day_mapping.items():
        if re.search(r'\b' + re.escape(key) + r'\b', payload.message.lower()):
            if val not in mentioned_days:
                mentioned_days.append(val)

    slots_context = ""
    if mentioned_days:
        result = find_available_slots(
            db=db,
            student_id=payload.studentId,
            preferred_days=mentioned_days,
            time_range="all"
        )
        slots_context = f"\n\n[System Context: Real-time conflict-free slots on {', '.join(mentioned_days)} are: {result}]"
    elif any(keyword in payload.message.lower() for keyword in ["config", "hours", "breaks", "working blocks"]):
        teacher_config = get_teacher_config(db=db)
        slots_context = f"\n\n[System Context: Current teacher schedule hours and configurations: {teacher_config}]"

    ollama_messages = [
        {"role": "system", "content": system_instruction}
    ]
    
    for turn in payload.history:
        role = "assistant" if turn.role == "model" else "user"
        ollama_messages.append({"role": role, "content": turn.content})
        
    user_content = payload.message + slots_context
    ollama_messages.append({"role": "user", "content": user_content})

    # Read model name from environment or fall back to default
    ollama_model = os.getenv("OLLAMA_MODEL", "gemma:2b")

    ollama_payload = {
        "model": ollama_model,
        "messages": ollama_messages,
        "stream": False
    }

    try:
        response = requests.post("http://127.0.0.1:11434/api/chat", json=ollama_payload, timeout=60)
        
        # Proactively identify if the requested model is missing on the server
        if response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Ollama is running, but the model '{ollama_model}' could not be found. "
                       f"Please run 'ollama pull {ollama_model}' in your terminal and try again."
            )
            
        response.raise_for_status()
        response_data = response.json()
        response_text = response_data.get("message", {}).get("content", "No content returned from local LLM.")
        return {"response": response_text}
        
    except requests.exceptions.ConnectionError:
         raise HTTPException(
            status_code=503,
            detail="Gemini API key is invalid, and your local Ollama server is offline. "
                   "Please start Ollama locally or configure a valid GEMINI_API_KEY environment variable."
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during local fallback: {str(e)}"
        )

# -------------------------------------------------------------
# Router Endpoint
# -------------------------------------------------------------
@router.post("")
def ai_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Receives conversational turns from the frontend, coordinates execution 
    of rule-based scheduling tools, and replies via Gemini.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback straight to local Ollama if environment variable is missing
        return run_local_ollama_fallback(payload, db)
        
    try:
        client = genai.Client(api_key=api_key)
    except Exception:
        # Fallback to local Ollama if Client fails to initialize
        return run_local_ollama_fallback(payload, db)
    
    # 1. Fetch current student information to dynamically brief the AI
    student = db.query(Student).filter(Student.student_id == payload.studentId).first()
    student_briefing = ""
    if student:
        override = db.query(Lesson).filter(Lesson.student_id == student.student_id).first()
        current_schedule_str = f"Their regular base lesson is {student.baseWeekday} at {student.baseTime}."
        if override:
            current_schedule_str += f" This week they have a rescheduled makeup lesson on {override.weekday} at {override.time}."
            
        student_briefing = f"""
        You are assisting with scheduling for:
        - Student Name: {student.name}
        - Student ID: {student.student_id}
        - Skill Level: {student.level}
        - Current Schedule: {current_schedule_str}
        """
        
    # 2. Updated System Instructions: Enforcing ultra-minimal, concise outputs
    system_instruction = f"""You are the Cadenza Music Studio Scheduling Agent.
    You help teachers find the best lesson slots for their students.
    {student_briefing}
    
    CRITICAL BEHAVIOR:
    - NEVER ask clarifying questions about preferred time of day, ranges, or parameters before searching. Think and check for yourself first.
    - If the user mentions a day (e.g. "Monday", "Friday", "Wednesday") or asks to look at times, IMMEDIATELY call the 'find_available_slots' tool. Set 'preferred_days' to that day and 'time_range' to 'all'.
    - If you find slots, present ONLY a clean, minimal bulleted list of the actual times returned by the tool.
    - STRICT FORMATTING COMPLIANCE:
      Present the results exactly like this, replacing the placeholders with the actual times returned by the tool:
      Here are the top options for <Day>:
      * <First Actual Time (e.g., 3:30 PM)>
      * <Second Actual Time (e.g., 4:00 PM)>
      * <Third Actual Time (e.g., 4:30 PM)>
    - NEVER print the literal words 'Time 1' or keep the brackets. Output only the actual times.
    - NEVER append scheduling reasons, descriptions, or explanation texts to the times. Output ONLY the raw times.
    - If no slots are found on that day, state that clearly and propose checking alternative days of the week in a single short sentence.
    - Keep answers incredibly crisp, simple, and direct. Do not write long-winded conversational greetings or intros."""

    # Configured to disable automatic execution so our custom loop is respected
    dynamic_config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=[find_slots_tool, get_config_tool], # FIX: Direct reference list
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        temperature=0.2
    )
    
    # Map input history safely
    contents = []
    for turn in payload.history:
        contents.append(
            types.Content(
                role="user" if turn.role == "user" else "model",
                parts=[types.Part(text=turn.content)]
            )
        )
    contents.append(
        types.Content(role="user", parts=[types.Part(text=payload.message)])
    )
    
    try:
        # Initial model generation call using the updated stable model
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=dynamic_config
        )

        # Recurse and fetch Gemini response
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=dynamic_config
        )
        
        # Safeguard: If the AI output is blank (common with empty tool results), return a helpful message
        response_text = response.text
        if not response_text or not response_text.strip():
            response_text = "I am unable to find any available times. Please add some working blocks in the Settings tab!"
        
        # Tool Call execution loop
        while response.function_calls:
            contents.append(response.candidates[0].content)
            
            tool_responses = []
            for tool_call in response.function_calls:
                name = tool_call.name
                args = tool_call.args or {}
                
                if name == "find_available_slots":
                    # Fallback to payload's student ID if not provided
                    student_id = args.get("student_id")
                    if not student_id or student_id == "None" or not str(student_id).startswith("student_"):
                        student_id = payload.studentId
                    
                    # Safe normalization for preferred_days
                    raw_preferred_days = args.get("preferred_days", [])
                    if isinstance(raw_preferred_days, str):
                        preferred_days = [raw_preferred_days]
                    elif isinstance(raw_preferred_days, list):
                        preferred_days = [str(d) for d in raw_preferred_days]
                    else:
                        preferred_days = []
                        
                    time_range = args.get("time_range") or "all"
                    
                    expand_mins_val = args.get("expand_mins")
                    expand_mins = int(expand_mins_val) if expand_mins_val is not None else 0
                    
                    step_mins_val = args.get("step_mins")
                    step_mins = int(step_mins_val) if step_mins_val is not None else 15
                    
                    allow_event_days_val = args.get("allow_event_days")
                    allow_event_days = bool(allow_event_days_val) if allow_event_days_val is not None else False
                    
                    result = find_available_slots(
                        db=db,
                        student_id=student_id,
                        preferred_days=preferred_days,
                        time_range=time_range,
                        expand_mins=expand_mins,
                        step_mins=step_mins,
                        allow_event_days=allow_event_days
                    )
                elif name == "get_teacher_config":
                    result = get_teacher_config(db=db)
                else:
                    result = {"error": f"Tool '{name}' not found."}
                    
                part_kwargs = {
                    "name": name,
                    "response": {"result": result}
                }
                if hasattr(tool_call, "id") and tool_call.id:
                    part_kwargs["id"] = tool_call.id

                part = types.Part.from_function_response(**part_kwargs)
                tool_responses.append(part)
                
            contents.append(types.Content(role="tool", parts=tool_responses))
            
            # Recurse and fetch Gemini response
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=dynamic_config
            )
            
        return {"response": response.text}
        
    except Exception as e:
        # Fallback to local Ollama if any API call error occurs (e.g. quota limit exceeded)
        print(f"Gemini API Error triggered fallback: {str(e)}")
        return run_local_ollama_fallback(payload, db)