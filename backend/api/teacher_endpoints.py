from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.db.models import (
    User, Subject, Concept, Question, Attempt, MasterySnapshot,
    Student, Mastery, LearningProfile, DoubtQuery
)
from backend.auth.roles import get_current_user, require_role
from backend.core.gap_analyzer import GapAnalyzer

router = APIRouter(prefix="/teacher", tags=["Teacher Analytics & Class Monitoring"])
gap_analyzer = GapAnalyzer()


@router.get("/class/{class_id}/roster")
def get_class_roster(
    class_id: str,
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Returns the list of students in the specified class with mastery metrics and recent activity.
    """
    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
        # Fallback to all students if class_id empty
        students = db.query(Student).all()

    roster = []
    for s in students:
        profile = db.query(LearningProfile).filter(LearningProfile.student_id == s.id).first()
        masteries = db.query(Mastery).filter(Mastery.student_id == s.id).all()

        avg_mastery = sum(m.mastery_score for m in masteries) / max(1, len(masteries)) if masteries else 0.25
        last_attempt = db.query(Attempt).filter(Attempt.student_id == s.id).order_by(Attempt.timestamp.desc()).first()
        recent_act = last_attempt.timestamp.strftime("%Y-%m-%d %H:%M") if last_attempt else "No attempts yet"

        roster.append({
            "id": s.id,
            "name": s.name,
            "email": s.email or f"{s.id}@eduadapt.ai",
            "class_id": s.class_id or class_id,
            "diagnostic_completed": profile.diagnostic_completed if profile else False,
            "average_mastery": round(avg_mastery, 3),
            "recent_activity": recent_act,
            "current_streak": profile.current_streak if profile else 0
        })

    return {
        "class_id": class_id,
        "total_students": len(roster),
        "students": roster
    }


@router.get("/class/{class_id}/subject/{subject_id}/heatmap")
def get_class_subject_heatmap(
    class_id: str,
    subject_id: str,
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Returns a subject x concept grid for all students in the class,
    color-coded by class mastery values.
    """
    dag = gap_analyzer.subject_dags.get(subject_id)
    if not dag:
        raise HTTPException(status_code=404, detail=f"Subject '{subject_id}' not found in concept graphs.")

    # Get topological concept list
    import networkx as nx
    try:
        ordered_cids = list(nx.topological_sort(dag))
    except Exception:
        ordered_cids = list(dag.nodes())

    concepts_meta = []
    for full_cid in ordered_cids:
        node = dag.nodes[full_cid]
        concepts_meta.append({
            "id": full_cid,
            "raw_id": node.get("raw_id", full_cid.split(".")[-1]),
            "name": node.get("name", full_cid),
            "difficulty_base": node.get("difficulty_base", 3)
        })

    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
        students = db.query(Student).all()

    matrix = []
    student_meta = []
    all_scores = []

    for s in students:
        student_meta.append({"id": s.id, "name": s.name})
        row = []
        for c in concepts_meta:
            full_cid = c["id"]
            raw_cid = c["raw_id"]
            # Look up mastery
            m = db.query(Mastery).filter(
                Mastery.student_id == s.id,
                (Mastery.concept_id == full_cid) | (Mastery.concept_id == raw_cid)
            ).first()

            val = m.mastery_score if m else 0.25
            row.append(round(val, 3))
            all_scores.append(val)
        matrix.append(row)

    class_avg = sum(all_scores) / max(1, len(all_scores)) if all_scores else 0.25
    subj_name = gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)

    return {
        "class_id": class_id,
        "subject_id": subject_id,
        "subject_name": subj_name,
        "concepts": concepts_meta,
        "students": student_meta,
        "matrix": matrix,
        "class_average_mastery": round(class_avg, 3)
    }


@router.get("/class/{class_id}/subject/{subject_id}/common-gaps")
def get_class_common_gaps(
    class_id: str,
    subject_id: str,
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Returns concepts where the highest % of students are weak (<0.70),
    ranked descending, per subject.
    """
    dag = gap_analyzer.subject_dags.get(subject_id)
    if not dag:
        raise HTTPException(status_code=404, detail=f"Subject '{subject_id}' not found.")

    students = db.query(Student).filter(Student.class_id == class_id).all()
    if not students:
        students = db.query(Student).all()

    total_studs = len(students)
    if total_studs == 0:
        return {"class_id": class_id, "subject_id": subject_id, "ranked_gaps": []}

    ranked = []
    for full_cid, node in dag.nodes(data=True):
        raw_cid = node.get("raw_id", full_cid.split(".")[-1])
        c_name = node.get("name", raw_cid)
        diff = node.get("difficulty_base", 3)

        # Count how many students have mastery < 0.70
        weak_count = 0
        for s in students:
            m = db.query(Mastery).filter(
                Mastery.student_id == s.id,
                (Mastery.concept_id == full_cid) | (Mastery.concept_id == raw_cid)
            ).first()
            val = m.mastery_score if m else 0.25
            if val < 0.70:
                weak_count += 1

        weak_pct = round((weak_count / total_studs) * 100, 1)

        ranked.append({
            "concept_id": full_cid,
            "raw_concept_id": raw_cid,
            "concept_name": c_name,
            "difficulty_base": diff,
            "weak_student_count": weak_count,
            "total_students": total_studs,
            "weak_percentage": weak_pct,
            "is_root_bottleneck_for_many": (weak_pct >= 50.0 and len(list(dag.predecessors(full_cid))) == 0)
        })

    # Rank descending by weak_percentage
    ranked.sort(key=lambda x: -x["weak_percentage"])
    subj_name = gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)

    return {
        "class_id": class_id,
        "subject_id": subject_id,
        "subject_name": subj_name,
        "ranked_gaps": ranked
    }


@router.get("/student/{student_id}/full-profile")
def get_student_full_profile(
    student_id: str,
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Teacher view of a student: full multi-subject mastery, gap maps,
    raw attempt logs, and mastery snapshots.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{student_id}' not found.")

    profile = db.query(LearningProfile).filter(LearningProfile.student_id == student_id).first()

    # Raw attempts
    attempts = db.query(Attempt).filter(Attempt.student_id == student_id).order_by(Attempt.timestamp.desc()).limit(50).all()
    attempts_data = [
        {
            "id": a.id,
            "subject_id": a.subject_id,
            "question_id": a.question_id,
            "student_answer": a.student_answer,
            "correct": a.correct,
            "timestamp": a.timestamp.isoformat()
        }
        for a in attempts
    ]

    # Snapshots
    snapshots = db.query(MasterySnapshot).filter(MasterySnapshot.student_id == student_id).order_by(MasterySnapshot.timestamp.asc()).all()
    snapshots_data = [
        {
            "subject_id": s.subject_id,
            "concept_id": s.concept_id,
            "mastery_score": round(s.mastery_score, 3),
            "timestamp": s.timestamp.isoformat()
        }
        for s in snapshots
    ]

    # Subject breakdowns
    subject_summaries = {}
    for sid, sinfo in gap_analyzer.subjects_metadata.items():
        masteries = db.query(Mastery).filter(
            Mastery.student_id == student_id,
            (Mastery.subject_id == sid) | (Mastery.concept_id.like(f"{sid}.%"))
        ).all()
        m_map = {m.concept_id: m.mastery_score for m in masteries}
        analysis = gap_analyzer.analyze_student(m_map, subject_id=sid)
        subject_summaries[sid] = {
            "subject_name": sinfo.get("display_name", sid),
            "mastered_count": analysis["mastered_count"],
            "gap_count": analysis["gap_count"],
            "root_bottleneck": analysis.get("root_bottleneck_concept"),
            "gaps": analysis.get("gaps", [])
        }

    # Recent Doubts asked by this student (Section 4)
    doubts = db.query(DoubtQuery).filter(DoubtQuery.student_id == student_id).order_by(DoubtQuery.timestamp.desc()).limit(20).all()
    doubts_data = [
        {
            "id": d.id,
            "subject_id": d.subject_id,
            "concept_id": d.concept_id,
            "question_text": d.question_text,
            "ai_response": d.ai_response,
            "timestamp": d.timestamp.strftime("%b %d, %H:%M") if d.timestamp else "Recent"
        }
        for d in doubts
    ]

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "class_id": student.class_id
        },
        "learning_profile": {
            "current_streak": profile.current_streak if profile else 0,
            "max_streak": profile.max_streak if profile else 0,
            "adaptive_difficulty": profile.adaptive_difficulty if profile else 3.0,
            "diagnostic_completed": profile.diagnostic_completed if profile else False,
            "diagnostic_baseline_score": profile.diagnostic_baseline_score if profile else 0.0
        },
        "subject_summaries": subject_summaries,
        "recent_doubts": doubts_data,
        "raw_attempts": attempts_data,
        "snapshots_count": len(snapshots_data),
        "snapshots": snapshots_data[-20:]  # most recent 20
    }


@router.get("/student/{student_id}/doubts")
def get_student_doubts(
    student_id: str,
    current_user: User = Depends(require_role(["teacher"])),
    db: Session = Depends(get_db)
):
    """
    Returns recent doubts asked by the student for teacher visibility.
    """
    doubts = db.query(DoubtQuery).filter(DoubtQuery.student_id == student_id).order_by(DoubtQuery.timestamp.desc()).limit(30).all()
    return {
        "student_id": student_id,
        "total_doubts": len(doubts),
        "doubts": [
            {
                "id": d.id,
                "subject_id": d.subject_id,
                "concept_id": d.concept_id,
                "question_text": d.question_text,
                "ai_response": d.ai_response,
                "timestamp": d.timestamp.strftime("%b %d, %H:%M") if d.timestamp else "Recent"
            }
            for d in doubts
        ]
    }

