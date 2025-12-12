# create_db.py

import models
import database
from sqlalchemy import text # <-- NEW IMPORT

def create_database_tables():
    # ... (Keep this function as is) ...
    print("Attempting to connect to the database and create tables...")
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating database tables. Is PostgreSQL running? Error: {e}")

# --- REPLACED FUNCTION ---
def drop_database_tables():
    """Drops all database tables using CASCADE for robustness (DELETES ALL DATA)."""
    print("WARNING: Attempting to drop all database tables (DELETES ALL DATA)...")
    try:
        # List all tables you have defined (Add/remove tables as needed)
        # Order doesn't matter when using CASCADE
        table_names = ["files", "folders", "messages", "rooms", "users", "room_members"] 
        
        with database.engine.begin() as connection:
            for table_name in table_names:
                print(f"Dropping table {table_name} CASCADE...")
                # Execute raw SQL command with IF EXISTS and CASCADE
                connection.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE"))
        
        print("Database tables dropped successfully!")
    except Exception as e:
        print(f"Error dropping database tables. Is PostgreSQL running? Error: {e}")
        
if __name__ == "__main__":
    
    drop_database_tables()
    create_database_tables()