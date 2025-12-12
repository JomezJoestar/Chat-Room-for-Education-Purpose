from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict
import models
import database
import auth
import json # Ensure this is imported for explicit JSON handling
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])
connections: dict[str, list[WebSocket]] = defaultdict(list)

@router.websocket("/{room_name}")
async def websocket_endpoint(websocket: WebSocket, room_name: str, db: Session = Depends(database.get_db)):
    token = websocket.query_params.get("token")
    
    try:
        user = auth.get_current_user(token=token, db=db)
    except:
        await websocket.close(code=1008, reason="Authentication failed")
        return
        
    room = db.query(models.Room).filter(models.Room.name == room_name).first()
    if not room:
        await websocket.close(code=1003, reason="Room not found")
        return
    
    is_member = db.query(models.user_room_association).filter( 
        models.user_room_association.c.user_id == user.id,      
        models.user_room_association.c.room_id == room.id      
    ).first()
    
    if not is_member:
        await websocket.close(code=1008, reason="Access denied: Not a room member")
        return

    await websocket.accept()
    connections[room_name].append(websocket)
    recent_messages = db.query(models.Message)\
                        .filter(models.Message.room_id == room.id)\
                        .order_by(models.Message.timestamp.asc())\
                        .all()
    
    for msg in recent_messages:
        await websocket.send_json({
            "id": msg.id,
            "user": msg.user.username,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "fileReference": msg.file_id,  
            "fileName": msg.file_name,
            "fileType": msg.file_type,

        })

    try:
        while True:

            received_data = await websocket.receive_json() 
            

            content = received_data.get("content")
            file_id = received_data.get("fileReference")
            file_name = received_data.get("fileName")
            file_type = received_data.get("fileType")


            if not content and not file_id:
                 continue
            message = models.Message(
                room_id=room.id, 
                user_id=user.id, 
                content=content,
                file_id=file_id,
                file_name=file_name,
                file_type=file_type,
            )
            db.add(message)
            db.commit()
            db.refresh(message)

            payload = {
                "id": message.id,
                "user": user.username, 
                "content": content, 
                "timestamp": message.timestamp.isoformat(),
                "fileReference": file_id,
                "fileName": file_name,
                "fileType": file_type,
            }
            
            for conn in connections[room_name]:
                await conn.send_json(payload)
                
    except WebSocketDisconnect:
        connections[room_name].remove(websocket)
    except json.JSONDecodeError:
        print("Received non-JSON data from client.")
    except Exception as e:
        print(f"An error occurred: {e}")


@router.delete("/message/{message_id}")
def delete_message_http(
    message_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")
        

    if message.file_id:
        file_record = db.query(models.File).filter(models.File.id == message.file_id).first()
        if file_record:
            db.delete(file_record)
            
    db.delete(message)
    db.commit()

    return {"message_id": message_id, "status": "deleted", "room_id": message.room_id}

@router.post("/room/{room_id}/join")
def join_room(
    room_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")


    if current_user in room.members:
        return {"message": f"You are already a member of room '{room.name}'"}
    

    room.members.append(current_user)
    db.commit()
    return {"message": f"Successfully joined room '{room.name}'"}

@router.post("/room/{room_id}/leave")
def leave_room(
    room_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if current_user not in room.members:
        raise HTTPException(status_code=403, detail=f"You are not a member of room '{room.name}'")

    room.members.remove(current_user)
    db.commit()
    return {"message": f"Successfully left room '{room.name}'"}


class Member(BaseModel):
    id: int
    username: str

    class Config:

        orm_mode = True

@router.get("/room/{room_id}/members", response_model=List[Member])
def get_room_members(
    room_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        

    is_member = db.query(models.user_room_association).filter(
        models.user_room_association.c.user_id == current_user.id,
        models.user_room_association.c.room_id == room_id
    ).first()

    if not is_member:
        raise HTTPException(status_code=403, detail="Access denied: Not a member of this room.")

    return room.members


class InviteRequest(BaseModel):
    username: str
@router.post("/room/{room_id}/invite")
def invite_user_to_room(
    room_id: int, 
    request: InviteRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    is_inviter_member = db.query(models.user_room_association).filter(
        models.user_room_association.c.user_id == current_user.id,
        models.user_room_association.c.room_id == room_id
    ).first()
    if not is_inviter_member:
        raise HTTPException(status_code=403, detail="Only members can invite others to this room.")

    invitee = db.query(models.User).filter(models.User.username == request.username).first()
    if not invitee:
        raise HTTPException(status_code=404, detail=f"User '{request.username}' not found.")
    
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if invitee in room.members:
        return {"message": f"User '{invitee.username}' is already a member of '{room.name}'."}

    room.members.append(invitee)
    db.commit()
    
    return {"message": f"User '{invitee.username}' successfully invited and added to room '{room.name}'."}

@router.delete("/room/{room_id}/kick/{target_user_id}")
def kick_member(
    room_id: int, 
    target_user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to kick members from this room.")


    if current_user.id == target_user_id:
        raise HTTPException(status_code=400, detail="Use the /leave route to exit the room.")


    membership = db.query(models.user_room_association).filter(
        models.user_room_association.c.user_id == target_user_id,
        models.user_room_association.c.room_id == room_id
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Target user is not a member of this room.")

    db.query(models.user_room_association).filter(
        models.user_room_association.c.user_id == target_user_id,
        models.user_room_association.c.room_id == room_id
    ).delete(synchronize_session='fetch')
    db.commit()
    
    return {"status": "success", "message": f"User {target_user_id} has been kicked from room '{room.name}'."}