from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
import models
import database
import auth
import mimetypes

API_URL = 'http://localhost:8000'
router = APIRouter(prefix="/files", tags=["files"])

@router.post("/upload/generic")
async def upload_generic_file(file: UploadFile = File(...), db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    content = await file.read()
    # Save the file without a room_id, just linked to the user
    db_file = models.File(filename=file.filename, content=content, uploaded_by=current_user.id, room_id=None)
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    # Return a permanent URL to download this file by its ID
    return {"file_url": f"{API_URL}/files/download/by_id/{db_file.id}"}

@router.get("/download/by_id/{file_id}")
def download_file_by_id(
    file_id: int, 
    db: Session = Depends(database.get_db),
    # Authentication should be removed or made optional for profile images
):
    # 1. Find the file
    db_file = db.query(models.File).filter(models.File.id == file_id).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    # 2. ✅ CRITICAL FIX: Determine MIME type based on filename
    # This prevents the browser from reading the data as generic raw data.
    mime_type, _ = mimetypes.guess_type(db_file.filename)
    
    # Fallback to a common image type if guess_type fails
    if not mime_type or not mime_type.startswith('image/'):
        mime_type = 'image/jpeg' # Safest fallback

    file_content = db_file.content
    file_stream = BytesIO(file_content)
    
    # 3. Return StreamingResponse with correct headers
    return StreamingResponse(
        file_stream,
        media_type=mime_type, # <-- Use the determined MIME type
        # The 'inline' disposition tells the browser to display the content.
        headers={'Content-Disposition': 'inline'} 
    )
@router.post("/upload/{room_name}")
async def upload_file(room_name: str, file: UploadFile = File(...),
                      db: Session = Depends(database.get_db),
                      current_user: models.User = Depends(auth.get_current_user)):
    room = db.query(models.Room).filter(models.Room.name == room_name).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    content = await file.read()
    db_file = models.File(room_id=room.id, filename=file.filename,
                          content=content, uploaded_by=current_user.id)
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    # CRITICAL CHANGE: Return the file ID
    return {"message": f"File {file.filename} uploaded to {room_name}", "file_id": db_file.id}

@router.get("/list/{room_name}")
def list_files(room_name: str, db: Session = Depends(database.get_db),
               current_user: models.User = Depends(auth.get_current_user)):
    room = db.query(models.Room).filter(models.Room.name == room_name).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    files = db.query(models.File).filter(models.File.room_id == room.id).all()
    return [
        {"filename": f.filename, "uploaded_by": f.user.username, "timestamp": f.timestamp.isoformat()} 
        for f in files
    ]

@router.get("/download/{room_name}/{filename}")
def download_file(room_name: str, filename: str,
                  db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(auth.get_current_user)):
    room = db.query(models.Room).filter(models.Room.name == room_name).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db_file = db.query(models.File).filter(
        models.File.room_id == room.id, 
        models.File.filename == filename
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found in room")

    return StreamingResponse(
        BytesIO(db_file.content),
        media_type='application/octet-stream',
        headers={'Content-Disposition': f'attachment;filename="{db_file.filename}"'}
    )