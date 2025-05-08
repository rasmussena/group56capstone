from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import jwt
import json
import random
import re

from backend.redis_client import redis_client

from backend.routes.auth import get_user_by_id
from backend.routes.auth import router as auth_router

from openai import OpenAI
import os

from langchain_openai import ChatOpenAI
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.messages import AIMessage, HumanMessage

import backend.retriever

from backend.graph import build_graph

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

retriever = backend.retriever.create_retriever("data/Physics-WEB_Sab7RrQ.pdf", "Physics")


# Create FastAPI app
app = FastAPI(title="TextbookAI API")
app.include_router(auth_router, prefix="/auth", tags=["auth"])

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Configuration
SECRET_KEY = "your-secret-key"  # TODO: Replace with a secure key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Models - using str instead of EmailStr
class User(BaseModel):
    id: str
    username: str
    email: str  # Changed from EmailStr to str
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserCreate(User):
    password: str

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatMessage(BaseModel):
    message: str

class QuizOption(BaseModel):
    id: str
    text: str
    isCorrect: bool

class Quiz(BaseModel):
    question: str
    options: List[QuizOption]
    explanation: Optional[str] = None

class ChatResponse(BaseModel):
    response: Optional[str] = None
    saved: bool = False
    isQuiz: bool = False
    quiz: Optional[Quiz] = None

class QuizAnswer(BaseModel):
    messageId: str
    optionId: str
    isCorrect: bool

class UserProgress(BaseModel):
    correct_answers: int = 0
    total_answers: int = 0
    streak: int = 0
    last_answer_time: Optional[datetime] = None
    topics_mastered: List[str] = []
    level: int = 1
    xp: int = 0

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Authentication helper functions
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validates JWT token and returns the user if valid.
    Returns None for unauthenticated requests.
    """
    if token is None:
        return None
        
    try:
        # Decode the token (verify its signature and expiration)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")  # 'sub' is the typical key for user ID in JWT
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing user information",
            )

        # Optionally, you could verify token expiration here:
        expiration = payload.get("exp")
        if expiration and datetime.fromtimestamp(expiration, timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )

        # Assuming you have a function to get the user from your DB
        user = await get_user_by_id(user_id)  # Replace with your DB fetching logic
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return user
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

async def get_current_active_user(current_user: Optional[User] = Depends(get_current_user)):
    """
    Checks if the authenticated user is active.
    Returns None for unauthenticated requests.
    """
    if current_user is None:
        return None
        
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Routes

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Returns the current authenticated user's information.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

@app.post("/chat", response_model=ChatResponse)
async def chat_with_textbooks(
    message: ChatMessage,
    current_user: Optional[User] = Depends(get_current_active_user),
    authorization: Optional[str] = Header(None)
):
    if not message.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = current_user.id if current_user else "anonymous"

    history = RedisChatMessageHistory(
        session_id=session_id,
        url="redis://localhost:6379"
    )
    previous_messages = history.messages if history.messages else []

    previous_messages.append(HumanMessage(content=message.message))

    llm = ChatOpenAI(model="gpt-4o", temperature=0, streaming=True)
    graph = build_graph(llm, retriever)

    reply = ""
    for event in graph.stream(
        {"messages": previous_messages},
        {"configurable": {"thread_id": session_id}}
    ):
        for value in event.values():
            reply = value["messages"][-1].content

    saved = current_user is not None
    quiz = None

    if random.random() < 0.2:
        try:
            quiz = generate_quiz_for_topic(topic=message.message, graph=graph, session_id=session_id, previous_messages=previous_messages)
        except ValueError as e:
            # Log or handle the error as needed
            print(f"Quiz generation failed: {e}")

    if saved:
        history.add_user_message(message.message)
        history.add_ai_message(reply)
        if quiz:
            history.add_ai_message(f"[QUIZ] {quiz.json()}")  # Save quiz as a serialized string

    return {
        "response": reply,
        "quiz": quiz.dict() if quiz else None,
        "saved": saved
    }


@app.get("/chat/history")
async def get_chat_history(current_user: User = Depends(get_current_active_user)):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access chat history",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        history = RedisChatMessageHistory(
            session_id=current_user.id,
            url="redis://localhost:6379",
        )
        chat_history = history.messages  # List of HumanMessage / AIMessage objects
        return [
            {
                "role": "user" if isinstance(m, HumanMessage) else "assistant",
                "content": m.content
            } for m in chat_history
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chat history: {str(e)}",
        )
    
@app.post("/quiz/answer")
async def submit_quiz_answer(
    answer: QuizAnswer,
    current_user: User = Depends(get_current_active_user)
):
    """
    Records a user's answer to a quiz question and updates their progress.
    Requires authentication.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to save quiz answers",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # TODO: Implement your quiz answer processing logic
    # 1. Get the user's current progress from Redis
    # 2. Update the progress based on the answer
    # 3. Save the updated progress back to Redis
    # 4. Return the updated progress
    
    # Example implementation:
    try:
        # Get current progress from Redis or create new
        progress_key = f"user:{current_user.id}:progress"
        progress_data = redis_client.get(progress_key)
        
        if progress_data:
            progress = UserProgress.parse_raw(progress_data)
        else:
            progress = UserProgress()
        
        # Update progress
        progress.total_answers += 1
        if answer.isCorrect:
            progress.correct_answers += 1
            progress.streak += 1
            progress.xp += 10  # Base XP for correct answer
            
            # Bonus XP for streak
            if progress.streak >= 5:
                progress.xp += 5
            if progress.streak >= 10:
                progress.xp += 10
                
            # Level up logic
            if progress.xp >= progress.level * 100:
                progress.level += 1
        else:
            progress.streak = 0
        
        progress.last_answer_time = datetime.now()
        
        # Save updated progress to Redis
        redis_client.set(progress_key, progress.json())
        
        # Also save this specific answer
        answer_key = f"user:{current_user.id}:answers:{answer.messageId}"
        redis_client.set(answer_key, json.dumps({
            "optionId": answer.optionId,
            "isCorrect": answer.isCorrect,
            "timestamp": datetime.now().isoformat()
        }))
        
        return {
            "success": True,
            "progress": progress.dict(),
            "message": "Answer recorded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record answer: {str(e)}")

@app.get("/user/progress")
async def get_user_progress(current_user: User = Depends(get_current_active_user)):
    """
    Returns the user's learning progress.
    Requires authentication.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access progress",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        progress_key = f"user:{current_user.id}:progress"
        progress_data = redis_client.get(progress_key)
        
        if progress_data:
            progress = UserProgress.parse_raw(progress_data)
            return progress.dict()
        else:
            return UserProgress().dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve progress: {str(e)}")
    

# More helper functions
def generate_quiz_for_topic(topic: str, graph, session_id, previous_messages) -> Quiz:
    """
    Generates a quiz for the given topic.
    Replace this with your actual quiz generation logic.
    """

    json_format = '{"question": "question", "options": [{"id": "1", "text": "First possible answer", "isCorrect": false}, {"id": "2", "text": "Second possible answer", "isCorrect": true}, {"id": "3", "text": "Third possible answer", "isCorrect": false}, {"id": "4", "text": "Fourth possible answer", "isCorrect": false}], "explanation": ""}'
    message = f"Based on this text from the user, text:'{topic}', generate a multipe choice quiz in the json format {json_format}. Use the textbook to generate this quiz and only return the json quiz object. If the text field is not enough to generate a quiz, use previous messages from the user"
    previous_messages.append(HumanMessage(content=message))
    reply = ""
    for event in graph.stream(
        {"messages": previous_messages},
        {"configurable": {"thread_id": session_id}}
    ):
        for value in event.values():
            reply = value["messages"][-1].content

        # Extract the JSON string
    json_match = re.search(r'```json\s*({.*?})\s*```', reply, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        json_str = reply  # fallback in case it's not wrapped in ```json ```

    try:
        quiz_data = json.loads(json_str)
        quiz = Quiz(
            question=quiz_data["question"],
            options=[
                QuizOption(id=opt["id"], text=opt["text"], isCorrect=opt["isCorrect"])
                for opt in quiz_data["options"]
            ],
            explanation=quiz_data["explanation"]
        )
        return quiz
    except Exception as e:
        print(f"Failed to parse or construct quiz: {e}")

def update_user_progress(user_id: str, topic: str, is_correct: bool):
    """
    Updates the user's progress in Redis.
    """
    # TODO: Implement your progress tracking logic
    try:
        # Get current progress
        progress_key = f"user:{user_id}:progress"
        progress_data = redis_client.get(progress_key)
        
        if progress_data:
            progress = UserProgress.parse_raw(progress_data)
        else:
            progress = UserProgress()
        
        # Update progress
        if is_correct:
            # Track mastered topics
            if topic not in progress.topics_mastered:
                topic_correct_key = f"user:{user_id}:topic:{topic}:correct"
                topic_correct = redis_client.incr(topic_correct_key)
                
                if topic_correct >= 3:  # Consider a topic mastered after 3 correct answers
                    progress.topics_mastered.append(topic)
        
        # Save updated progress
        redis_client.set(progress_key, progress.json())
    except Exception as e:
        print(f"Error updating progress: {e}")


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)