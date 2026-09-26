import os
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.db.models import User, Subject, Question
from backend.auth.roles import get_current_user, require_role
from backend.ingestion.question_bank_parser import QuestionBankParser
from backend.ingestion.drive_ingestion_service import GoogleDriveIngestionService

router = APIRouter(prefix="/admin", tags=["Admin & Question Ingestion"])
parser = QuestionBankParser()
drive_service = GoogleDriveIngestionService()


class DriveImportRequest(BaseModel):
    folder_url_or_id: Optional[str] = "https://drive.google.com/drive/folders/1hGhtwrpMxWxtwi4NAnkreCz-_B5dy_Eo"


class DriveConfirmRequest(BaseModel):
    confirmed_questions: List[Dict[str, Any]]


@router.get("/subjects")
def get_subjects():
    """Returns the registered 6 subjects."""
    return {"subjects": list(parser.subjects.values())}


@router.get("/question-bank/{subject_id}")
def get_subject_question_bank(subject_id: str):
    """Returns the current questions in the question bank for a given subject."""
    q_file = os.path.join(os.path.dirname(__file__), "..", "data", "question_banks", f"{subject_id}.json")
    if not os.path.exists(q_file):
        raise HTTPException(status_code=404, detail=f"No question bank found for subject '{subject_id}'")
    with open(q_file, "r") as f:
        data = json.load(f)
    return {"subject_id": subject_id, "total_questions": len(data), "questions": data}


@router.post("/question-bank/upload")
async def upload_question_bank(
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    overrides_json: Optional[str] = Form(None),
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Accepts CSV, PDF, or DOCX question bank file.
    Parses questions and maps each one to a concept_id from that subject's concept graph.
    Stores as backend/data/question_banks/<subject_id>.json and in DB.
    """
    if subject_id not in parser.subjects:
        raise HTTPException(status_code=400, detail=f"Invalid subject_id '{subject_id}'. Allowed: {list(parser.subjects.keys())}")

    filename = file.filename.lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    overrides = {}
    if overrides_json:
        try:
            overrides = json.loads(overrides_json)
        except Exception:
            overrides = {}

    try:
        if filename.endswith(".csv"):
            parsed_questions = parser.parse_csv(content, subject_id, overrides)
        elif filename.endswith(".pdf"):
            parsed_questions = parser.parse_pdf(content, subject_id, overrides)
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            parsed_questions = parser.parse_docx(content, subject_id, overrides)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV, PDF, or DOCX.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse question file: {str(e)}")

    if not parsed_questions:
        raise HTTPException(status_code=400, detail="Could not extract any valid questions from the uploaded file.")

    # Save to JSON
    json_path = parser.save_question_bank(subject_id, parsed_questions, merge=True)

    # Persist / update in DB questions table
    for q in parsed_questions:
        existing = db.query(Question).filter(Question.id == q["id"]).first()
        if not existing:
            db_q = Question(
                id=q["id"],
                subject_id=subject_id,
                concept_id=q["concept_id"],
                text=q["text"],
                options=q["options"],
                correct_answer=str(q["correct_answer"]),
                explanation=q.get("explanation", ""),
                difficulty=float(q.get("difficulty", 3.0))
            )
            db.add(db_q)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully ingested {len(parsed_questions)} questions into '{subject_id}'",
        "subject_id": subject_id,
        "saved_path": json_path,
        "questions_count": len(parsed_questions),
        "sample_questions": parsed_questions[:3]
    }


# ==============================================================
# GOOGLE DRIVE INGESTION ENDPOINTS
# ==============================================================

@router.post("/drive-import")
def scan_google_drive(
    req: DriveImportRequest,
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Scans a Google Drive folder URL or ID.
    Enumerates files (recursing into subfolders), detects subjects, parses questions,
    and returns a preview with per-subject counts and questions flagged for review.
    """
    res = drive_service.scan_folder(req.folder_url_or_id)
    if res.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("error_message", "Google Drive ingestion failed.")
        )
    return res


@router.post("/drive-import/confirm")
def confirm_drive_import(
    req: DriveConfirmRequest,
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Writes confirmed questions from Google Drive into backend/data/question_banks/<subject_id>.json,
    merging with existing questions, and persists into the SQLite questions table.
    """
    if not req.confirmed_questions:
        raise HTTPException(status_code=400, detail="No questions provided to confirm.")

    result = drive_service.confirm_import(req.confirmed_questions)

    # Persist in DB
    for q in req.confirmed_questions:
        sid = q.get("subject_id") or "maths3"
        cid = q.get("concept_id") or f"{sid}.C01"
        existing = db.query(Question).filter(Question.id == q["id"]).first()
        if not existing:
            db_q = Question(
                id=q["id"],
                subject_id=sid,
                concept_id=cid,
                text=q["text"],
                options=q.get("options", []),
                correct_answer=str(q.get("correct_answer", "0")),
                explanation=q.get("explanation", ""),
                difficulty=float(q.get("difficulty", 3.0))
            )
            db.add(db_q)
    db.commit()

    return result


# ==============================================================
# AI STATUS HEALTH CHECK (Feature 4)
# ==============================================================
from backend.genai.content_service import GenAIContentService

@router.get("/ai-status")
async def get_ai_status():
    """
    Returns whether the configured AI key is valid and reachable (lightweight test call).
    Used as a status indicator in the Teacher/Admin app before demos.
    """
    return await GenAIContentService.ai_health_check()
