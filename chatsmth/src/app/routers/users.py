from fastapi import APIRouter, Depends, HTTPException, Form # CRITICAL: Ensure 'Form' is imported
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import models
import database
import auth
from pydantic import BaseModel, Field

router = APIRouter(prefix="/users", tags=["users"])

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=72)

@router.post("/register")
def register_user(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(database.get_db)
):
    # Debugging: Print the received username and password
    print(f"Received username: {username}, password: {password}")
    # Truncate password to 72 characters
    password = password[:72]

    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = auth.get_password_hash(password)
    user = models.User(username=username, hashed_password=hashed_password)

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully", "id": user.id}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"id": current_user.id, "username": current_user.username}