import os
import sys

# Ensure workspace root is in sys.path
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from backend.db.session import init_db, SessionLocal
from backend.api.student_endpoints import router as student_router
from backend.api.teacher_endpoints import router as teacher_router
from backend.api.admin_endpoints import router as admin_router
from backend.api.endpoints import router as legacy_router

app = FastAPI(
    title="EduAdapt AI — Multi-Subject Adaptive Learning Platform",
    description="Full-cycle adaptive learning platform with 6-subject concept graphs, Bayesian Knowledge Tracing, GenAI pedagogy, and teacher analytics.",
    version="2.0.0",
)

# CORS configuration allowing local and remote clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe database initialization
@app.on_event("startup")
def on_startup():
    try:
        init_db()
        from backend.db.models import Concept
        from scripts.seed_demo_data import seed_database
        db = SessionLocal()
        try:
            if db.query(Concept).count() == 0:
                print("Seeding initial database concepts and questions...")
                seed_database()
        except Exception as seed_err:
            print(f"Database seed note: {seed_err}")
        finally:
            db.close()
    except Exception as e:
        print(f"Startup initialization notice: {e}")

# Mount all endpoint routers both at root and /api
for r in [student_router, teacher_router, admin_router, legacy_router]:
    app.include_router(r, prefix="")
    app.include_router(r, prefix="/api")

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EduAdapt AI Backend",
        "version": "2.0.0",
        "subjects": ["maths3", "automata_theory", "adsa", "java", "c_programming", "python"]
    }

# Serve Frontend static assets and index if built
dist_dir = os.path.join(workspace_root, "frontend", "dist")
index_file = os.path.join(dist_dir, "index.html")
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/")
def root_endpoint():
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "online",
        "service": "EduAdapt AI — Multi-Subject Adaptive Learning Platform",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/favicon.ico")
def favicon():
    fav = os.path.join(workspace_root, "frontend", "public", "vite.svg")
    if os.path.exists(fav):
        return FileResponse(fav)
    return JSONResponse(status_code=204, content=None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
