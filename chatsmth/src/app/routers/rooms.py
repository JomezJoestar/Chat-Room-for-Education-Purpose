from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import database
import auth
from pydantic import BaseModel # <-- CRITICAL IMPORT


router = APIRouter(prefix="/rooms", tags=["rooms"])

class RoomCreateRequest(BaseModel):
    name: str
    profile_url: str = None # Optional URL
def join_room_user(db: Session, user: models.User, room: models.Room):
    if room not in user.rooms:
        user.rooms.append(room)
        db.commit()


@router.post("/create")
def create_room(
    request: RoomCreateRequest, # <-- Now accepts the JSON model
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
    
):
    existing = db.query(models.Room).filter(models.Room.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Room already exists")
        
    # Use request.name and request.profile_url
    room = models.Room(name=request.name, profile_url=request.profile_url,creator_id=current_user.id) 
    
    db.add(room)
    db.flush()
    
    join_room_user(db, current_user, room)

    db.refresh(room)
    return {"message": "Room created successfully", "room_id": room.id}

@router.post("/join/{room_name}")
def join_room(
    room_name: str, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.name == room_name).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    join_room_user(db, current_user, room)
    
    return {"message": f"Successfully joined room: {room_name}"}

@router.get("/list")
def list_rooms(db: Session = Depends(database.get_db),
               current_user: models.User = Depends(auth.get_current_user)):
    
    my_rooms = current_user.rooms 
    
    return [
        {"id": r.id, "name": r.name,"profile_url": r.profile_url} 
        for r in my_rooms
    ]

@router.get("/{room_name}")
def get_room(room_name: str, db: Session = Depends(database.get_db),
             current_user: models.User = Depends(auth.get_current_user)):
    room = db.query(models.Room).filter(models.Room.name == room_name).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if room not in current_user.rooms:
        raise HTTPException(status_code=403, detail="Not a member of this room")
        
    return {"id": room.id, "name": room.name}

@router.delete("/delete/{room_id}")
def delete_room(
    room_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    print(room)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Not authorized to delete this room")
    
    message_count = db.query(func.count(models.Message.id))\
        .filter(models.Message.room_id == room_id)\
        .scalar()
        
    # 3. Deny deletion if messages exist
    if message_count > 0:
        print(f"Deleting {message_count} messages from room ID {room_id} ('{room.name}').")
        
        db.query(models.Message)\
          .filter(models.Message.room_id == room_id)\
          .delete(synchronize_session=False)
        db.query(models.Message)\
          .filter(models.Message.room_id == room_id)\
          .delete(synchronize_session='fetch') 
        
        db.commit()
        
        print("All messages deleted successfully.")
        

    db.query(models.File).filter(models.File.room_id == room_id).delete(synchronize_session=False)
    db.delete(room)
    db.commit()
    
    return {"message": f"Room {room_id} deleted successfully"}


class RoomUpdateRequest(BaseModel):
    profile_url: str | None = None # Only allowing profile_url update for now

@router.patch("/update/{room_id}")
def update_room(
    room_id: int, 
    request: RoomUpdateRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if current_user not in room.members:
        raise HTTPException(status_code=403, detail="Not authorized to update this room")

    # Update the profile URL
    room.profile_url = request.profile_url
    
    db.commit()
    db.refresh(room)
    
    return {"message": f"Room {room_id} profile updated successfully", "profile_url": room.profile_url}