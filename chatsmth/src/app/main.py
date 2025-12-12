from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import routers,meterial

app = FastAPI(title="Chat Rooms App")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]




app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Add your frontend's URL here
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


for r in routers:
    app.include_router(r)


app.include_router(meterial.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Chat Rooms App"}
