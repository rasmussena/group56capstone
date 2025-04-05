from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import jwt
from ..models.user import User, UserCreate, UserInDB
from ..config import settings

router = APIRouter()

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Creates a JWT token with the given data and expiration.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticates user and returns JWT token.
    """
    # TODO: Implement your authentication logic
    # 1. Verify username and password against your database
    # 2. If valid, create and return a JWT token
    # 3. If invalid, raise HTTPException with 401 status code
    
    # Example structure:
    # user = authenticate_user(form_data.username, form_data.password)
    # if not user:
    #     raise HTTPException(status_code=401, detail="Invalid credentials")
    # 
    # access_token = create_access_token(data={"sub": user.username})
    # return {"access_token": access_token, "token_type": "bearer"}
    
    raise HTTPException(status_code=501, detail="Not implemented")

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """
    Registers a new user.
    """
    # TODO: Implement your user registration logic
    # 1. Check if username or email already exists
    # 2. Hash the password
    # 3. Create the user in your database
    # 4. Return success or appropriate error
    
    # Example structure:
    # if username_exists(user.username) or email_exists(user.email):
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Username or email already registered"
    #     )
    # 
    # hashed_password = get_password_hash(user.password)
    # user_data = user.dict()
    # user_data["hashed_password"] = hashed_password
    # del user_data["password"]
    # 
    # new_user = create_user_in_db(user_data)
    # return {"message": "User created successfully"}
    
    raise HTTPException(status_code=501, detail="Not implemented")

