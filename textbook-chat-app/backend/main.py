from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# Create FastAPI app
app = FastAPI(title="TextbookAI API")

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
        # TODO: Implement your JWT decoding logic
        return None
    except Exception:
        return None

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
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticates user and returns JWT token.
    """
    # TODO: Implement your authentication logic
    raise HTTPException(status_code=501, detail="Not implemented")

@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: dict):
    """
    Registers a new user.
    """
    # TODO: Implement your user registration logic
    raise HTTPException(status_code=501, detail="Not implemented")

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
    message: ChatMessage, current_user: Optional[User] = Depends(get_current_active_user)
):
    from openai import OpenAI
    import os

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # This works because .env is loaded
    print("KEY:", os.getenv("OPENAI_API_KEY"))


    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that knows about textbooks."},
                {"role": "user", "content": message.message},
            ],
        )
        reply = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    saved = current_user is not None
    return {"response": reply, "saved": saved}



@app.get("/chat/history")
async def get_chat_history(current_user: User = Depends(get_current_active_user)):
    """
    Returns the chat history for the authenticated user.
    Requires authentication.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access chat history",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # TODO: Implement your chat history retrieval logic
    return []

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)