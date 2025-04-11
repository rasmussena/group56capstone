from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import jwt
import json

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

class ChatResponse(BaseModel):
    response: str
    saved: bool = False

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
    current_user: Optional[User] = Depends(get_current_active_user)
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
    if saved:
        history.add_user_message(message.message)
        history.add_ai_message(reply)

    return {"response": reply, "saved": saved}


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


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)