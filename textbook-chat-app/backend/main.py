from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from .routes import auth, textbooks, chat
from .models.user import User
from .config import settings

# Create FastAPI app
app = FastAPI(title="TextbookAI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme - auto_error=False allows endpoints to handle unauthenticated requests
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Include routers
app.include_router(auth.router, tags=["authentication"])
app.include_router(textbooks.router, prefix="/textbooks", tags=["textbooks"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

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
        # payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # username: str = payload.get("sub")
        # if username is None:
        #     return None
        # 
        # user = get_user_from_database(username)
        # return user
        
        # For now, return None as placeholder
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

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

