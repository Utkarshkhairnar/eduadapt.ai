import os
import sys

# Ensure workspace root is in sys.path
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.session import init_db
from backend.api.student_endpoints import router as student_router
from backend.api.teacher_endpoints import router as teacher_router
from backend.api.admin_endpoints import router as admin_router
from backend.api.endpoints import router as legacy_router

app = FastAPI(
    title="EduAdapt AI — Multi-Subject Adaptive Learning Platform",
    description="Full-cycle adaptive learning platform with 6-subject concept graphs, Bayesian Knowledge Tracing, GenAI pedagogy, and teacher analytics.",
    version="2.0.0",
)

# CORS configuration allowing local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Mount all endpoint routers both at root and /api
for r in [student_router, teacher_router, admin_router, legacy_router]:
    app.include_router(r, prefix="")
    app.include_router(r, prefix="/api")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EduAdapt AI Backend",
        "version": "2.0.0",
        "subjects": ["maths3", "automata_theory", "adsa", "java", "c_programming", "python"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
