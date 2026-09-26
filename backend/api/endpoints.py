import uuid
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.db.models import Student, Mastery, AssessmentAttempt, QuestionResponse, LearningProfile, LearningPathItem
from backend.api import schemas
from backend.core.knowledge_tracer import BayesianKnowledgeTracer
from backend.core.gap_analyzer import GapAnalyzer
from backend.core.path_generator import PathGenerator
from backend.core.quiz_engine import AdaptiveQuizEngine
from backend.genai.content_service import GenAIContentService

router = APIRouter()

# Initialize core services
bkt_tracer = BayesianKnowledgeTracer.from_config()
gap_analyzer = GapAnalyzer()
path_generator = PathGenerator(gap_analyzer)
quiz_engine = AdaptiveQuizEngine()
genai_service = GenAIContentService()


def get_or_create_student(db: Session, student_id: str, name: str = "Alex Rivera") -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = Student(id=student_id, name=name, email=f"{student_id}@eduadapt.ai")
        db.add(student)
        profile = LearningProfile(
            student_id=student_id,
            current_streak=0,
            max_streak=0,
            adaptive_difficulty=0.50,
            diagnostic_completed=False,
        )
        db.add(profile)

        # Initialize baseline masteries for all concepts
        for cid, cinfo in gap_analyzer.concepts_dict.items():
            m = Mastery(
                student_id=student_id,
                concept_id=cid,
                concept_name=cinfo["name"],
                mastery_score=0.25,
                prior_score=0.25,
                attempts_count=0,
                correct_count=0,
            )
            db.add(m)
        db.commit()
        db.refresh(student)
    return student


def get_student_mastery_map(db: Session, student_id: str) -> Dict[str, float]:
    masteries = db.query(Mastery).filter(Mastery.student_id == student_id).all()
    if not masteries:
        return {cid: 0.25 for cid in gap_analyzer.concepts_dict.keys()}
    return {m.concept_id: m.mastery_score for m in masteries}


# -------------------------------------------------------------
# 1. POST /assessment/start
# -------------------------------------------------------------
@router.post("/assessment/start", response_model=schemas.DiagnosticStartResponse)
def start_diagnostic_assessment(req: schemas.DiagnosticStartRequest, db: Session = Depends(get_db)):
    student = get_or_create_student(db, req.student_id, req.student_name or "Alex Rivera")

    attempt_id = f"diag_{uuid.uuid4().hex[:8]}"
    attempt = AssessmentAttempt(
        id=attempt_id,
        student_id=student.id,
        assessment_type="diagnostic",
        score=0.0,
        total_questions=0,
        correct_count=0,
    )
    db.add(attempt)
    db.commit()

    # Pick 1 representative diagnostic question for each concept from C01 to C12
    # Ensure wide foundational coverage
    selected_questions = []
    import networkx as nx
    topo_concepts = list(nx.topological_sort(gap_analyzer.dag))

    for cid in topo_concepts:
        candidates = [q for q in quiz_engine.questions if q["concept_id"] == cid]
        if candidates:
            # Pick first candidate for diagnostic baseline
            q_data = candidates[0]
            selected_questions.append(schemas.QuestionSchema(
                id=q_data["id"],
                concept_id=q_data["concept_id"],
                concept_name=q_data.get("concept_name", gap_analyzer.concepts_dict[cid]["name"]),
                difficulty=q_data["difficulty"],
                prompt=q_data["prompt"],
                code_snippet=q_data.get("code_snippet"),
                options=q_data["options"],
                hint=q_data.get("hint"),
                # Hide correct_index and explanation during assessment
                correct_index=None,
                explanation=None,
            ))

    return schemas.DiagnosticStartResponse(
        attempt_id=attempt_id,
        student_id=student.id,
        questions=selected_questions,
        total_questions=len(selected_questions),
        instructions=(
            "Complete this 12-question diagnostic assessment to map your Python & Algorithmic foundations. "
            "Our Bayesian Knowledge Tracer will calculate latent mastery and detect prerequisite bottlenecks."
        )
    )


# -------------------------------------------------------------
# 2. POST /assessment/submit
# -------------------------------------------------------------
@router.post("/assessment/submit", response_model=schemas.DiagnosticSubmitResponse)
def submit_diagnostic_assessment(req: schemas.DiagnosticSubmitRequest, db: Session = Depends(get_db)):
    attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == req.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Assessment attempt not found")

    correct_count = 0
    total = len(req.answers)
    concept_summaries = []

    for item in req.answers:
        # Match question in question bank
        q_info = next((q for q in quiz_engine.questions if q["id"] == item.question_id), None)
        if not q_info:
            continue

        is_correct = (item.selected_option == q_info["correct_index"])
        if is_correct:
            correct_count += 1

        # Fetch mastery row
        mastery_row = db.query(Mastery).filter(
            Mastery.student_id == req.student_id,
            Mastery.concept_id == item.concept_id,
        ).first()

        prior_score = mastery_row.mastery_score if mastery_row else 0.25

        # Update via BKT
        new_mastery, _ = bkt_tracer.update(
            prior_p_l=prior_score,
            is_correct=is_correct,
            difficulty=q_info["difficulty"],
        )

        if mastery_row:
            mastery_row.prior_score = prior_score
            mastery_row.mastery_score = new_mastery
            mastery_row.attempts_count += 1
            if is_correct:
                mastery_row.correct_count += 1
        else:
            c_name = gap_analyzer.concepts_dict.get(item.concept_id, {}).get("name", item.concept_id)
            mastery_row = Mastery(
                student_id=req.student_id,
                concept_id=item.concept_id,
                concept_name=c_name,
                mastery_score=new_mastery,
                prior_score=prior_score,
                attempts_count=1,
                correct_count=1 if is_correct else 0,
            )
            db.add(mastery_row)

        # Log question response
        resp = QuestionResponse(
            attempt_id=attempt.id,
            student_id=req.student_id,
            question_id=item.question_id,
            concept_id=item.concept_id,
            difficulty=q_info["difficulty"],
            selected_option=item.selected_option,
            is_correct=is_correct,
            mastery_before=prior_score,
            mastery_after=new_mastery,
            response_time_seconds=item.response_time_seconds or 5.0,
        )
        db.add(resp)

        c_meta = gap_analyzer.concepts_dict.get(item.concept_id, {})
        concept_summaries.append(schemas.ConceptMasterySummary(
            concept_id=item.concept_id,
            concept_name=c_meta.get("name", item.concept_id),
            category=c_meta.get("category", "General"),
            tier=c_meta.get("tier", 1),
            mastery_score=new_mastery,
            prior_score=prior_score,
            delta=round(new_mastery - prior_score, 4),
            is_mastered=(new_mastery >= gap_analyzer.mastery_threshold),
            is_weak_gap=(new_mastery < gap_analyzer.weak_threshold),
        ))

    score_pct = round((correct_count / max(1, total)) * 100, 1)
    attempt.score = score_pct
    attempt.total_questions = total
    attempt.correct_count = correct_count

    # Update LearningProfile
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == req.student_id).first()
    if profile:
        profile.diagnostic_completed = True
        profile.diagnostic_baseline_score = score_pct

    db.commit()

    return schemas.DiagnosticSubmitResponse(
        attempt_id=attempt.id,
        student_id=req.student_id,
        score=score_pct,
        correct_count=correct_count,
        total_questions=total,
        concept_masteries=concept_summaries,
        summary_message=f"Diagnostic complete! Scored {score_pct}% ({correct_count}/{total}). Knowledge graph calibrated."
    )


# -------------------------------------------------------------
# 3. GET /gaps/{student_id}
# -------------------------------------------------------------
@router.get("/gaps/{student_id}", response_model=schemas.KnowledgeGapResponse)
def get_knowledge_gaps(student_id: str, db: Session = Depends(get_db)):
    get_or_create_student(db, student_id)
    mastery_map = get_student_mastery_map(db, student_id)
    analysis = gap_analyzer.analyze_student(mastery_map)

    # Convert dictionary items to Pydantic models
    root_bottleneck = None
    if analysis.get("root_bottleneck_concept"):
        rb = analysis["root_bottleneck_concept"]
        root_bottleneck = schemas.ConceptGapItem(**rb)

    gaps = [schemas.ConceptGapItem(**g) for g in analysis["gaps"]]
    nodes = [schemas.GraphNodeSchema(**n) for n in analysis["graph_nodes"]]
    edges = [schemas.GraphEdgeSchema(**e) for e in analysis["graph_edges"]]

    return schemas.KnowledgeGapResponse(
        student_id=student_id,
        mastery_threshold=analysis["mastery_threshold"],
        total_concepts=analysis["total_concepts"],
        mastered_count=analysis["mastered_count"],
        gap_count=analysis["gap_count"],
        root_bottleneck_concept=root_bottleneck,
        gaps=gaps,
        graph_nodes=nodes,
        graph_edges=edges,
        analysis_narrative=analysis["analysis_narrative"],
    )


# -------------------------------------------------------------
# 4. GET /learning-path/{student_id}
# -------------------------------------------------------------
@router.get("/learning-path/{student_id}", response_model=schemas.LearningPathResponse)
async def get_personalized_learning_path(student_id: str, db: Session = Depends(get_db)):
    get_or_create_student(db, student_id)
    mastery_map = get_student_mastery_map(db, student_id)
    path_data = path_generator.generate_path(mastery_map)

    root_bottleneck = path_data.get("target_gap_concept")
    if not root_bottleneck:
        # If all mastered, pick highest tier concept for mastery polish
        target_cid = "C12"
        target_meta = gap_analyzer.concepts_dict["C12"]
        target_gap_item = schemas.ConceptGapItem(
            concept_id="C12",
            concept_name=target_meta["name"],
            category=target_meta.get("category", "General"),
            tier=target_meta.get("tier", 4),
            mastery_score=mastery_map.get("C12", 0.9),
            is_gap=False,
            is_root_bottleneck=False,
            unmet_prerequisites=[],
            blocking_for=[],
            gap_severity=0.0,
            recommendation="Mastery polish challenge.",
        )
    else:
        target_cid = root_bottleneck["concept_id"]
        target_meta = gap_analyzer.concepts_dict[target_cid]
        target_gap_item = schemas.ConceptGapItem(**root_bottleneck)

    # Call GenAI service for tailored lesson content targeted at this gap
    student_mastery = mastery_map.get(target_cid, 0.25)
    genai_content_dict = await genai_service.generate_lesson_for_gap(
        concept_id=target_cid,
        concept_name=target_meta["name"],
        concept_metadata=target_meta,
        student_mastery=student_mastery,
    )

    genai_content = schemas.GenAIContentSchema(**genai_content_dict)
    curriculum = [schemas.LearningPathStep(**step) for step in path_data["curriculum"]]

    # Save target concept to profile
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == student_id).first()
    if profile:
        profile.target_concept_id = target_cid
        db.commit()

    return schemas.LearningPathResponse(
        student_id=student_id,
        target_gap_concept=target_gap_item,
        curriculum=curriculum,
        genai_content=genai_content,
        learning_strategy=path_data["learning_strategy"],
    )


# -------------------------------------------------------------
# 5. POST /quiz/next-question
# -------------------------------------------------------------
@router.post("/quiz/next-question", response_model=schemas.QuizQuestionResponse)
def get_next_quiz_question(req: schemas.QuizNextQuestionRequest, db: Session = Depends(get_db)):
    student = get_or_create_student(db, req.student_id)
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == student.id).first()

    # Determine target concept: request override -> profile target -> root bottleneck -> C01
    target_cid = req.concept_id or (profile.target_concept_id if profile else None)
    if not target_cid:
        mastery_map = get_student_mastery_map(db, student.id)
        analysis = gap_analyzer.analyze_student(mastery_map)
        rb = analysis.get("root_bottleneck_concept")
        target_cid = rb["concept_id"] if rb else "C01"

    current_diff = profile.adaptive_difficulty if profile else 0.50
    current_streak = profile.current_streak if profile else 0

    # Retrieve seen questions in this student's recent responses to avoid repetition
    recent_responses = db.query(QuestionResponse.question_id).filter(
        QuestionResponse.student_id == student.id
    ).all()
    seen_ids = [r[0] for r in recent_responses]

    q_data, selected_diff = quiz_engine.select_next_question(
        concept_id=target_cid,
        current_difficulty=current_diff,
        current_streak=current_streak,
        seen_question_ids=seen_ids,
    )

    c_meta = gap_analyzer.concepts_dict.get(target_cid, {})
    mastery_map = get_student_mastery_map(db, student.id)
    student_mastery = mastery_map.get(target_cid, 0.25)

    question_schema = schemas.QuestionSchema(
        id=q_data["id"],
        concept_id=q_data["concept_id"],
        concept_name=q_data.get("concept_name", c_meta.get("name", target_cid)),
        difficulty=q_data["difficulty"],
        prompt=q_data["prompt"],
        code_snippet=q_data.get("code_snippet"),
        options=q_data["options"],
        hint=q_data.get("hint"),
        correct_index=None,  # Hidden during test
        explanation=None,    # Hidden during test
    )

    return schemas.QuizQuestionResponse(
        question=question_schema,
        current_difficulty=current_diff,
        current_streak=current_streak,
        target_concept_id=target_cid,
        target_concept_name=c_meta.get("name", target_cid),
        student_current_mastery=round(student_mastery, 3),
    )


# -------------------------------------------------------------
# 6. POST /quiz/submit-answer
# -------------------------------------------------------------
@router.post("/quiz/submit-answer", response_model=schemas.QuizAnswerSubmitResponse)
def submit_quiz_answer(req: schemas.QuizAnswerSubmitRequest, db: Session = Depends(get_db)):
    student = get_or_create_student(db, req.student_id)
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == student.id).first()
    mastery_row = db.query(Mastery).filter(
        Mastery.student_id == student.id,
        Mastery.concept_id == req.concept_id,
    ).first()

    prior_mastery = mastery_row.mastery_score if mastery_row else 0.25
    current_difficulty = req.difficulty
    current_streak = profile.current_streak if profile else 0

    result = quiz_engine.process_answer(
        student_id=student.id,
        question_id=req.question_id,
        selected_option=req.selected_option,
        current_difficulty=current_difficulty,
        current_streak=current_streak,
        prior_mastery=prior_mastery,
    )

    new_mastery = result["bkt_update"]["new_mastery"]

    # Persist Mastery updates
    if mastery_row:
        mastery_row.prior_score = prior_mastery
        mastery_row.mastery_score = new_mastery
        mastery_row.attempts_count += 1
        if result["is_correct"]:
            mastery_row.correct_count += 1
    else:
        c_name = gap_analyzer.concepts_dict.get(req.concept_id, {}).get("name", req.concept_id)
        mastery_row = Mastery(
            student_id=student.id,
            concept_id=req.concept_id,
            concept_name=c_name,
            mastery_score=new_mastery,
            prior_score=prior_mastery,
            attempts_count=1,
            correct_count=1 if result["is_correct"] else 0,
        )
        db.add(mastery_row)

    # Persist Profile state (streak & difficulty)
    if profile:
        profile.current_streak = result["streak"]
        profile.max_streak = max(profile.max_streak, result["streak"])
        profile.adaptive_difficulty = result["new_difficulty"]

    # Log Question Response
    # Find or create a quiz attempt session id
    quiz_attempt_id = f"quiz_sess_{student.id}"
    resp_log = QuestionResponse(
        attempt_id=quiz_attempt_id,
        student_id=student.id,
        question_id=req.question_id,
        concept_id=req.concept_id,
        difficulty=req.difficulty,
        selected_option=req.selected_option,
        is_correct=result["is_correct"],
        mastery_before=prior_mastery,
        mastery_after=new_mastery,
        response_time_seconds=req.response_time_seconds or 5.0,
    )
    db.add(resp_log)
    db.commit()

    return schemas.QuizAnswerSubmitResponse(
        student_id=student.id,
        is_correct=result["is_correct"],
        correct_option=result["correct_option"],
        explanation=result["explanation"],
        bkt_update=schemas.BKTUpdateDetail(**result["bkt_update"]),
        previous_difficulty=result["previous_difficulty"],
        new_difficulty=result["new_difficulty"],
        streak=result["streak"],
        difficulty_adjustment_reason=result["difficulty_adjustment_reason"],
        is_concept_now_mastered=result["is_concept_now_mastered"],
    )


# -------------------------------------------------------------
# 7. GET /profile/{student_id}
# -------------------------------------------------------------
@router.get("/profile/{student_id}", response_model=schemas.StudentProfileResponse)
def get_student_profile(student_id: str, db: Session = Depends(get_db)):
    student = get_or_create_student(db, student_id)
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == student.id).first()
    masteries = db.query(Mastery).filter(Mastery.student_id == student.id).all()

    mastery_deltas = []
    total_score = 0.0
    mastered_count = 0
    threshold = gap_analyzer.mastery_threshold

    for cid, cinfo in gap_analyzer.concepts_dict.items():
        m_row = next((m for m in masteries if m.concept_id == cid), None)
        curr = m_row.mastery_score if m_row else 0.25
        prior = m_row.prior_score if m_row else 0.25
        delta = round(curr - prior, 4)
        total_score += curr
        if curr >= threshold:
            mastered_count += 1
            status_str = "Mastered"
        elif curr < gap_analyzer.weak_threshold:
            status_str = "Critical Gap"
        else:
            status_str = "In Progress"

        mastery_deltas.append(schemas.MasteryDeltaItem(
            concept_id=cid,
            concept_name=cinfo["name"],
            baseline_mastery=round(prior, 3),
            current_mastery=round(curr, 3),
            delta=delta,
            status=status_str,
        ))

    total_concepts = len(gap_analyzer.concepts_dict)
    avg_mastery = round(total_score / max(1, total_concepts), 3)

    # Recent responses log
    responses = db.query(QuestionResponse).filter(
        QuestionResponse.student_id == student.id
    ).order_by(QuestionResponse.created_at.desc()).limit(10).all()

    recent_logs = []
    for r in responses:
        c_name = gap_analyzer.concepts_dict.get(r.concept_id, {}).get("name", r.concept_id)
        recent_logs.append({
            "question_id": r.question_id,
            "concept_id": r.concept_id,
            "concept_name": c_name,
            "difficulty": r.difficulty,
            "is_correct": r.is_correct,
            "mastery_before": r.mastery_before,
            "mastery_after": r.mastery_after,
            "delta": round(r.mastery_after - r.mastery_before, 4),
            "timestamp": r.created_at.isoformat() if r.created_at else "",
        })

    readiness = "Advanced" if avg_mastery >= 0.75 else ("Intermediate" if avg_mastery >= 0.50 else "Foundational")

    return schemas.StudentProfileResponse(
        student_id=student.id,
        name=student.name,
        current_streak=profile.current_streak if profile else 0,
        max_streak=profile.max_streak if profile else 0,
        adaptive_difficulty=profile.adaptive_difficulty if profile else 0.50,
        diagnostic_completed=profile.diagnostic_completed if profile else False,
        overall_mastery_average=avg_mastery,
        mastered_concepts_count=mastered_count,
        total_concepts_count=total_concepts,
        mastery_deltas=mastery_deltas,
        recent_responses=recent_logs,
        readiness_level=readiness,
    )


# -------------------------------------------------------------
# Extra Helpers: Concepts list, Reset Demo, and Health
# -------------------------------------------------------------
@router.get("/concepts")
def list_curriculum_concepts():
    return {
        "subject": gap_analyzer.config.get("app", {}).get("subject", "Python Programming"),
        "concepts": [c for c in gap_analyzer.graph_data.get("concepts", [])],
        "mastery_threshold": gap_analyzer.mastery_threshold,
    }


@router.post("/demo/reset")
def reset_demo_student(student_id: str = "demo-student-1", db: Session = Depends(get_db)):
    # Clear previous responses, attempts, and reset masteries to 0.25
    db.query(QuestionResponse).filter(QuestionResponse.student_id == student_id).delete()
    db.query(AssessmentAttempt).filter(AssessmentAttempt.student_id == student_id).delete()
    db.query(Mastery).filter(Mastery.student_id == student_id).delete()
    db.query(LearningProfile).filter(LearningProfile.student_id == student_id).delete()
    db.query(Student).filter(Student.id == student_id).delete()
    db.commit()

    student = get_or_create_student(db, student_id, "Alex Rivera")
    return {"status": "success", "message": f"Demo student '{student_id}' has been reset for a fresh evaluation cycle."}
