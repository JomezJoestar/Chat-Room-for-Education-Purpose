from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import models
import database
import auth
from io import BytesIO


router = APIRouter(prefix="/assignments", tags=["assignments"])

#yow nigger here is for teacher to post
@router.post("/create")
def post_all_property(
    file_id: int,
    description: str,
    duetime: datetime,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    new_assignment = models.Assignment(
        user_id=current_user.id,
        file_id=file_id,
        description=description,
        duetime=duetime,
        assigntime=datetime.utcnow(),
        issent=False,
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return {"message": "Assignment created successfully", "id": new_assignment.id}
#also for file file not id
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models, database, auth

@router.get("/list")
def get_all_property(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    assignments = db.query(models.Assignment).filter(models.Assignment.user_id == current_user.id).all()
    return [
        {
            "id": a.id,
            "file": a.file.filename if a.file else None,
            "description": a.description,
            "point": a.point,
            "assigntime": a.assigntime.isoformat(),
            "duetime": a.duetime.isoformat() if a.duetime else None,
            "issent": a.issent,
            "is_in_due_date": a.is_in_due_date(),
        }
        for a in assignments
    ]

#individual one
@router.get("/student/{student_id}")
def get_assignments_for_student(
    student_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Fetch assignments for the given student_id
    assignments = (
        db.query(models.Assignment)
        .filter(models.Assignment.user_id == student_id)
        .all()
    )

    if not assignments:
        raise HTTPException(status_code=404, detail="No assignments found for this student")

    # Build the response list
    return [
        {
            "id": a.id,
            "file": a.file.filename if a.file else None,
            "description": a.description,
            "point": a.point,
            "assigntime": a.assigntime.isoformat(),
            "duetime": a.duetime.isoformat() if a.duetime else None,
            "issent": a.issent,
            "is_in_due_date": a.is_in_due_date(),
        }
        for a in assignments
    ]


@router.post("/submit/{assignment_id}")
async def submit_assignment(
    assignment_id: int,
    uploaded_file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Fetch assignment
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.user_id == current_user.id  # Ensure student can only submit their own
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or not yours")

    # ctrl s
    content = await uploaded_file.read()
    db_file = models.File(
        room_id=None,  # Optional, or link to a classroom if you want
        filename=uploaded_file.filename,
        content=content,
        uploaded_by=current_user.id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    # Link file to assignment and mark as sent
    assignment.file_id = db_file.id
    assignment.issent = True
    db.commit()
    db.refresh(assignment)

    return {
        "message": f"Assignment {assignment_id} submitted successfully",
        "file_name": uploaded_file.filename,
        "issent": assignment.issent
    }

