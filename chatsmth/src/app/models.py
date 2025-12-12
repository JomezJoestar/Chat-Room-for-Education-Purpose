from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, LargeBinary, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base 
from zoneinfo import ZoneInfo
import bcrypt
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
user_room_association = Table(
    'user_room_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('room_id', Integer, ForeignKey('rooms.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True} # Adding this for safety on core tables
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    folders_created = relationship("Folder", back_populates="creator")
    
    rooms = relationship(
        "Room",
        secondary=user_room_association,
        back_populates="members"
    )

    messages = relationship("Message", back_populates="user")
    files = relationship("File", back_populates="user")
    assignments = relationship("Assignment", back_populates="student")

    def set_password(self, password: str):
        truncated_password = password[:72]
        self.hashed_password = bcrypt.hashpw(
            truncated_password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(
            password[:72].encode('utf-8'), self.hashed_password.encode('utf-8')
        )

class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = {'extend_existing': True} # Adding this for safety
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    creator_id = Column(Integer, ForeignKey('users.id'))
    profile_url = Column(String(255), nullable=True, default=None)
    
    members = relationship(
        "User",
        secondary=user_room_association,
        back_populates="rooms"
    )

    messages = relationship("Message", back_populates="room")
    files = relationship("File", back_populates="room")

class Message(Base):
    __tablename__ = "messages"
    __table_args__ = {'extend_existing': True} # FIX FOR InvalidRequestError
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=True) 
    
    # Fields for file handling
    file_id = Column(Integer, ForeignKey("files.id"), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("Room", back_populates="messages")
    user = relationship("User", back_populates="messages")
    file = relationship("File") 

class File(Base):
    __tablename__ = "files"
    __table_args__ = {'extend_existing': True} # Adding this for safety
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    filename = Column(String(255), nullable=False)
    content = Column(LargeBinary, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    room = relationship("Room", back_populates="files")
    user = relationship("User", back_populates="files")
    parent_folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = {'extend_existing': True} # Adding this for safety

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(Integer, ForeignKey("files.id"))
    point = Column(Integer, default=0)
    description = Column(Text)
    assigntime = Column(DateTime, default=datetime.utcnow)
    duetime = Column(DateTime)
    issent = Column(Integer, default=0) 

    student = relationship("User", back_populates="assignments")
    
    def is_in_due_date(self):
        if not self.duetime:
            return True
        now = datetime.now(ZoneInfo("Asia/Bangkok")).replace(tzinfo=None)
        return now < self.duetime.replace(tzinfo=None)
    

class Folder(Base):
    __tablename__ = "folders"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    parent_folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True) 

    creator = relationship("User", back_populates="folders_created") 
    files = relationship("MaterialFile", back_populates="parent_folder")

class MaterialFile(Base):
    __tablename__ = "material_files"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    filename = Column(String(255), nullable=False)
    
    content = Column(LargeBinary, nullable=False) 
    
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    parent_folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True) 

    user = relationship("User")
    room = relationship("Room")
    parent_folder = relationship("Folder", back_populates="files")