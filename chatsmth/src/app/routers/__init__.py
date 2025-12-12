from .users import router as users_router
from .rooms import router as rooms_router
from .chat import router as chat_router
from .files import router as files_router

routers = [users_router, rooms_router, chat_router, files_router]
