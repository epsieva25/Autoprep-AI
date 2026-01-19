This folder contains a Flask + SQLAlchemy backend wired for Postgres.

- Uses env var POSTGRES_URL (or builds from POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_HOST/POSTGRES_DATABASE)
- Optional API key: set API_KEY to require `x-api-key` on requests
- CORS enabled for `/api/*`

Endpoints:
- GET/POST /api/projects
- GET/PUT/DELETE /api/projects/<id>
- GET/POST /api/projects/<id>/datasets
- GET/POST /api/projects/<id>/analysis
- GET/POST /api/projects/<id>/processing
- GET /health

Local development (outside this preview):
1. Create a virtualenv and install requirements: `pip install -r backend/requirements.txt`
2. Export database envs (POSTGRES_URL or user/pass/host/db)
3. (Optional) export API_KEY for protected access
4. Create tables: `python scripts/create_db_tables.py`
5. Start server: `python backend/app.py` (defaults to http://localhost:8000)

Front-end integration:
- Set NEXT_PUBLIC_FLASK_API_URL (e.g. http://localhost:8000)
- (Optional) set NEXT_PUBLIC_FLASK_API_KEY if API_KEY is enabled
- The frontend will automatically use Flask when NEXT_PUBLIC_FLASK_API_URL is set, with graceful fallback otherwise.
