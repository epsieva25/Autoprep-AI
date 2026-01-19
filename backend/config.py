import os

class Settings:
    # Prefer a single DATABASE_URL; fall back to individual vars if needed
    DATABASE_URL = os.getenv("POSTGRES_URL") or os.getenv("POSTGRES_PRISMA_URL")
    if not DATABASE_URL:
        # Build a URL if individual pieces exist
        user = os.getenv("POSTGRES_USER")
        pwd = os.getenv("POSTGRES_PASSWORD")
        host = os.getenv("POSTGRES_HOST", "localhost")
        db = os.getenv("POSTGRES_DATABASE")
        if user and pwd and host and db:
            DATABASE_URL = f"postgresql+psycopg://{user}:{pwd}@{host}/{db}"
    
    # Fallback to SQLite if no URL is found
    if not DATABASE_URL:
        DATABASE_URL = "sqlite:///./test.db"
    # Optional API key auth (set to require key if provided)
    API_KEY = os.getenv("API_KEY")  # optional
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

settings = Settings()
