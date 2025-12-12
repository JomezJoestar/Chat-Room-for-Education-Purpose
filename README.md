"""
================================================================================
README.md: Chatting for learning (Website)
================================================================================

This project is designed for online education and real-time collaboration.

--------------------------------------------------------------------------------
✨ Key Features
--------------------------------------------------------------------------------

### Backend API (FastAPI / PostgreSQL)
* **Secure Authentication:** User registration and login managed via **JWT (JSON Web Tokens)** and **OAuth2**, using **Bcrypt** for secure password hashing (`auth.py`, `users.py`).
* **Real-time Communication:** Persistent, room-based chat functionality implemented using **WebSockets** (`chat.py`).
* **Classroom Management:** CRUD operations (Create, Join, Leave, Delete) for private rooms/classes (`rooms.py`).
* **Hierarchical Materials:** A nested file and folder structure for organizing course content and educational resources (`meterial.py`).
* **Assignment System:** Endpoints for teachers to post assignments (with due dates) and for students to upload files for submission (`assignment.py`).
* **File Storage:** Direct file uploads and secure downloads for chat files, assignments, and materials, stored as `LargeBinary` in the PostgreSQL database (`files.py`, `models.py`).

### Frontend (React / JSX / CSS)
* **SPA Architecture:** Single Page Application (SPA) using `react-router-dom` for navigation between Login, Register, and the main application dashboard (`App.jsx`).
* **State Management:** Standard React hooks (`useState`, `useEffect`, etc.) handle interactive elements and asynchronous API communications (`Webpage.jsx`).

--------------------------------------------------------------------------------
🛠️ Technology Stack
--------------------------------------------------------------------------------

| Component             | Technology              | Role                                     |
| :---                  | :---                    | :---                                     |
| **Backend Framework** | **FastAPI** (Python)    | High-speed API, routing, and WebSockets. |
| **Database** | **PostgreSQL** | Primary relational data store.           |
| **ORM** | **SQLAlchemy** | Database abstraction layer.              |
| **Authentication** | **JWT / Bcrypt** | Token and password security.             |
| **Real-time** | **FastAPI WebSockets** | Live chat functionality.                 |
| **Frontend** | **React** | User Interface library.                  |
| **Routing** | **React Router DOM** | Frontend navigation.                     |

--------------------------------------------------------------------------------
🚀 Getting Started
--------------------------------------------------------------------------------

### Prerequisites
1.  Python 3.10+
2.  Node.js & npm (or yarn/pnpm)
3.  A running PostgreSQL database instance.

### 1. Backend Setup (FastAPI)

1.  **Install Python Dependencies:**
    (e.g., `pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib[bcrypt] python-jose[cryptography] python-multipart`)
2.  **Configure Database:**
    Update the `DATABASE_URL` in `database.py` with your PostgreSQL credentials.
    (e.g., `postgresql://chatuser:chatpass@localhost:5432/chatdb`)
3.  **Initialize Tables:**
    Run the creation script: `python create_db.py`
4.  **Run Server:**
    Start the FastAPI application: `uvicorn main:app --reload`
    (API accessible at `http://localhost:8000`)

### 2. Frontend Setup (React)

1.  **Install Dependencies:**
    Navigate to the frontend directory and run: `npm install`
2.  **Verify API URL:**
    Ensure `const API_URL = 'http://localhost:8000';` in `Webpage.jsx` matches your backend.
3.  **Run Development Server:**
    Start the React application: `npm run dev`
    (Frontend accessible at `http://localhost:5173`)

