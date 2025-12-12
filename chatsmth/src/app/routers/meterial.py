from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import database
import auth
from pydantic import BaseModel
from datetime import datetime
import mimetypes
from io import BytesIO
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/materials", tags=["materials"])

class FolderCreate(BaseModel):
    name: str
    parent_folder_id: Optional[int] = None

class FileResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    user: str
    timestamp: str
    class Config:
        orm_mode = True
        
class FolderResponse(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class FolderContentResponse(BaseModel):
    files: List[FileResponse]
    folders: List[FolderResponse]

@router.post("/upload")
async def upload_file(
    room_id: int = Query(...), 
    file: UploadFile = File(...),
    parent_folder_id: Optional[int] = Form(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room or current_user not in room.members:
        raise HTTPException(status_code=403, detail="Room not found or access denied.")

    if parent_folder_id:
        parent_folder = db.query(models.Folder).filter(
            models.Folder.id == parent_folder_id,
            models.Folder.room_id == room_id
        ).first()
        if not parent_folder:
            raise HTTPException(status_code=404, detail="Parent folder not found in this room.")
    
    content = await file.read()
    
    file_type = mimetypes.guess_type(file.filename)[0] or file.content_type
    
    db_file = models.MaterialFile( 
        filename=file.filename,
        content=content, 
        uploaded_by=current_user.id,
        room_id=room_id,
        parent_folder_id=parent_folder_id
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    # ko = db.query(models.MaterialFile).filter(models.MaterialFile.id == db_file.id).first()

    # print(ko)
    # print()
    
    return {"message": "File uploaded successfully", "file_id": db_file.id, "filename": file.filename}

@router.post("/folder/create")
def create_folder(
    request: FolderCreate, 
    room_id: int = Query(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    
    if not room or current_user not in room.members:
        raise HTTPException(status_code=403, detail="Room not found or access denied.")

    existing = db.query(models.Folder).filter(
        models.Folder.room_id == room_id,
        models.Folder.name == request.name,
        models.Folder.parent_folder_id == request.parent_folder_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="A folder with this name already exists in this location.")

    new_folder = models.Folder(
        name=request.name,
        room_id=room_id,
        user_id=current_user.id,
        parent_folder_id=request.parent_folder_id
    )

    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)

    return {"id": new_folder.id, "name": new_folder.name, "message": "Folder created successfully"}

@router.get("/folder/contents", response_model=FolderContentResponse)
def get_folder_contents(
    room_id: int = Query(...), 
    folder_id: Optional[int] = Query(None, alias="folder_id"), 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
) -> FolderContentResponse:
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room or current_user not in room.members:
        raise HTTPException(status_code=403, detail="Room not found or access denied.")

    subfolders = db.query(models.Folder).filter(
        models.Folder.room_id == room_id,
        models.Folder.parent_folder_id == folder_id 
    ).all()
    
    files = db.query(models.MaterialFile).filter(
        models.MaterialFile.room_id == room_id,
        models.MaterialFile.parent_folder_id == folder_id
    ).all()

    file_responses = []
    for f in files:
        user = db.query(models.User).filter(models.User.id == f.uploaded_by).first() 
        content_type = mimetypes.guess_type(f.filename)[0] or 'application/octet-stream'

        file_responses.append(FileResponse(
            id=f.id,
            filename=f.filename,
            file_type=content_type,
            user=user.username if user else "Unknown User", 
            timestamp=f.timestamp.isoformat()
        ))

    folder_responses = [
        FolderResponse(id=f.id, name=f.name) 
        for f in subfolders
    ]

    return FolderContentResponse(files=file_responses, folders=folder_responses)


@router.get("/download/{file_id}")
def download_material_file(
    file_id: int, 
    db: Session = Depends(database.get_db),
    token: Optional[str] = Query(None, alias="token"), 
):
    current_user = None
    print(token)
    if token:
        try:
            current_user = auth.get_current_user(token=token, db=db) 
        except HTTPException:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
    print(current_user)

    db_file = db.query(models.MaterialFile).filter(models.MaterialFile.id == file_id).first()
    print(db_file)
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if db_file.room_id is not None:
        room = db.query(models.Room).filter(models.Room.id == db_file.room_id).first()
        
        if not room or current_user not in room.members:
            raise HTTPException(status_code=403, detail="Access denied. User is not a member of the file's room.")

    content_type = mimetypes.guess_type(db_file.filename)[0] or 'application/octet-stream'

    return StreamingResponse(
        BytesIO(db_file.content),
        media_type=content_type,
        headers={
            'Content-Disposition': f'inline; filename="{db_file.filename}"'
        }
    )

@router.delete("/delete/file/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    db_file = db.query(models.MaterialFile).filter(models.MaterialFile.id == file_id).first()
    print(db_file)
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if db_file.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied. Only the uploader can delete this file.")

    db.delete(db_file)
    db.commit()
    
    return {"message": f"File {db_file.filename} deleted successfully"}


@router.delete("/delete/folder/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):

    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    room = db.query(models.Room).filter(models.Room.id == db_folder.room_id).first()
    if not room or current_user not in room.members:
        raise HTTPException(status_code=403, detail="Access denied.")
    db.query(models.MaterialFile).filter(models.MaterialFile.parent_folder_id == folder_id).delete(synchronize_session=False)

    db.query(models.Folder).filter(models.Folder.parent_folder_id == folder_id).delete(synchronize_session=False)

    db.delete(db_folder)
    db.commit()
    
    return {"message": f"Folder {db_folder.name} and its contents deleted successfully"}