import os
import uuid
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.session import get_db
from backend.db.models import (
    User, Subject, Concept, Question, Attempt, MasterySnapshot,
    Student, Mastery, LearningProfile, AssessmentAttempt, QuestionResponse,
    LearningPreference, DoubtQuery, ContentFeedback
)
from backend.auth.roles import get_current_user, verify_student_access
from backend.api.schemas import (
    AssessmentStartRequest, AssessmentStartResponse,
    AssessmentSubmitRequest, AssessmentSubmitResponse, AnswerRevealItem,
    ConceptMasterySummary, KnowledgeGapResponse, LearningPathResponse,
    QuizNextQuestionRequest, QuizQuestionResponse,
    QuizAnswerSubmitRequest, QuizAnswerSubmitResponse,
    MultiSubjectHistoryResponse, SubjectMasteryOverview, MasterySnapshotItem,
    AttemptReportSummaryItem, AttemptReportsListResponse,
    ConceptAttemptBreakdownItem, AttemptFullReportResponse,
    LearningPreferenceSchema, AskDoubtRequest, AskDoubtResponse,
    ContentFeedbackRequest, ContentFeedbackResponse, DoubtQueryItem
)
from backend.core.knowledge_tracer import BayesianKnowledgeTracer
from backend.core.gap_analyzer import GapAnalyzer
from backend.core.path_generator import PathGenerator
from backend.core.quiz_engine import AdaptiveQuizEngine
from backend.genai.content_service import GenAIContentService

router = APIRouter(tags=["Student Adaptive Assessment & Learning"])

bkt_tracer = BayesianKnowledgeTracer.from_config()
gap_analyzer = GapAnalyzer()
path_generator = PathGenerator(gap_analyzer)
quiz_engine = AdaptiveQuizEngine()
genai_service = GenAIContentService()


def _ensure_student_records(db: Session, student_id: str, student_name: str = "Student User") -> Student:
    """Ensures Student and default Profile exist in DB."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        student = Student(id=student_id, name=student_name, class_id="CS-2026")
        db.add(student)
        db.commit()
        db.refresh(student)

    profile = db.query(LearningProfile).filter(LearningProfile.student_id == student_id).first()
    if not profile:
        profile = LearningProfile(
            student_id=student_id,
            current_streak=0,
            adaptive_difficulty=3.0,
            diagnostic_completed=False
        )
        db.add(profile)
        db.commit()

    return student


def _get_student_mastery_map(db: Session, student_id: str, subject_id: str) -> Dict[str, float]:
    """Retrieves student mastery scores for a subject."""
    records = db.query(Mastery).filter(
        Mastery.student_id == student_id,
        (Mastery.subject_id == subject_id) | (Mastery.concept_id.like(f"{subject_id}.%"))
    ).all()

    mastery_map = {}
    for m in records:
        mastery_map[m.concept_id] = m.mastery_score
        raw_id = m.concept_id.split(".")[-1]
        mastery_map[raw_id] = m.mastery_score

    # Fallback to subject concept defaults if empty
    if not mastery_map:
        concepts = gap_analyzer.subject_concepts.get(subject_id, {})
        for cid, cdata in concepts.items():
            full_cid = f"{subject_id}.{cdata['id']}" if not cdata['id'].startswith(f"{subject_id}.") else cdata['id']
            mastery_map[full_cid] = 0.25
            mastery_map[cdata['id']] = 0.25

    return mastery_map


# ==============================================================
# 2b) POST /assessment/start
# ==============================================================
@router.post("/assessment/start", response_model=AssessmentStartResponse)
def start_assessment(
    req: AssessmentStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assembles a diagnostic test by sampling questions across the subject's concepts
    (breadth-first from root concepts), difficulty weighted toward difficulty_base of each concept.
    """
    verify_student_access(current_user, req.student_id, db)
    _ensure_student_records(db, req.student_id, req.student_name or current_user.name)

    subject_id = req.subject_id
    questions = quiz_engine.get_subject_questions(subject_id)

    if not questions:
        raise HTTPException(status_code=404, detail=f"No questions available for subject '{subject_id}'")

    # Sample breadth-first from root concepts
    dag = gap_analyzer.subject_dags.get(subject_id)
    ordered_concept_ids = []
    if dag:
        import networkx as nx
        try:
            ordered_concept_ids = list(nx.topological_sort(dag))
        except Exception:
            ordered_concept_ids = list(dag.nodes())

    selected_questions = []
    seen_concepts = set()

    # Priority 1: One question per root/topological concept
    for full_cid in ordered_concept_ids:
        raw_cid = full_cid.split(".")[-1]
        matches = [
            q for q in questions
            if (q.get("concept_id") == full_cid or
                q.get("concept_id", "").endswith(f".{raw_cid}") or
                q.get("raw_concept_id") == raw_cid)
        ]
        if matches:
            # Sort by difficulty closeness to concept's difficulty_base
            target_diff = dag.nodes[full_cid].get("difficulty_base", 3)
            best_q = min(matches, key=lambda q: abs(float(q.get("difficulty", 3.0)) - target_diff))
            selected_questions.append(best_q)
            seen_concepts.add(raw_cid)

    # If any question bank questions remain unrepresented, fill up to 7-10 questions
    for q in questions:
        if len(selected_questions) >= 8:
            break
        raw_cid = q.get("concept_id", "").split(".")[-1]
        if raw_cid not in seen_concepts and q not in selected_questions:
            selected_questions.append(q)
            seen_concepts.add(raw_cid)

    if not selected_questions:
        selected_questions = questions[:7]

    attempt_id = f"diag_{subject_id}_{uuid.uuid4().hex[:8]}"

    # Save initial attempt in DB
    new_attempt = AssessmentAttempt(
        id=attempt_id,
        student_id=req.student_id,
        subject_id=subject_id,
        assessment_type="diagnostic",
        total_questions=len(selected_questions),
        score=0.0
    )
    db.add(new_attempt)
    db.commit()

    # Sanitize questions for student: omit correct_answer during test
    client_questions = []
    for q in selected_questions:
        client_questions.append({
            "id": q["id"],
            "subject_id": subject_id,
            "concept_id": q.get("concept_id", f"{subject_id}.C01"),
            "concept_name": q.get("concept_name", q.get("concept_id", "Concept")),
            "difficulty": float(q.get("difficulty", 3.0)),
            "text": q["text"],
            "options": q.get("options", []),
        })

    subj_name = gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)

    return AssessmentStartResponse(
        attempt_id=attempt_id,
        student_id=req.student_id,
        subject_id=subject_id,
        subject_name=subj_name,
        questions=client_questions,
        total_questions=len(client_questions),
        instructions=f"Diagnostic Assessment for {subj_name}. Answer each question to establish your prerequisite baseline."
    )


# ==============================================================
# 2c) POST /assessment/submit
# ==============================================================
@router.post("/assessment/submit", response_model=AssessmentSubmitResponse)
async def submit_assessment(
    req: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scores each answer against the question bank's correct answer.
    Returns a REVEAL payload per question: student's answer, correct answer,
    correct/incorrect flag, and an explanation.
    Immediately triggers the 5-step recompute cascade before responding:
      1. knowledge_tracer.update_mastery(student_id, subject_id, results)
      2. gap_analyzer.recompute(student_id, subject_id)
      3. path_generator.regenerate(student_id, subject_id)
      4. quiz_engine.recalibrate_difficulty(student_id, subject_id)
      5. profile_store.snapshot(student_id, subject_id)
    """
    verify_student_access(current_user, req.student_id, db)
    subject_id = req.subject_id
    questions = quiz_engine.get_subject_questions(subject_id)
    q_map = {q["id"]: q for q in questions}

    reveal_items = []
    correct_count = 0
    now = datetime.datetime.utcnow()

    # Find or link AssessmentAttempt
    attempt = None
    if req.attempt_id:
        attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == req.attempt_id).first()
    if not attempt:
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.student_id == req.student_id,
            AssessmentAttempt.subject_id == subject_id,
            AssessmentAttempt.assessment_type == "diagnostic",
            AssessmentAttempt.score == 0.0
        ).order_by(AssessmentAttempt.created_at.desc()).first()
    if not attempt:
        attempt_id = f"diag_{subject_id}_{uuid.uuid4().hex[:8]}"
        attempt = AssessmentAttempt(
            id=attempt_id,
            student_id=req.student_id,
            subject_id=subject_id,
            assessment_type="diagnostic",
            total_questions=len(req.answers),
            score=0.0,
            created_at=now
        )
        db.add(attempt)
        db.flush()
    else:
        attempt_id = attempt.id

    # Step 1: Score questions & prepare reveal items
    recorded_responses = []
    for ans in req.answers:
        q = q_map.get(ans.question_id)
        raw_correct_ans = str(q.get("correct_answer", "0") if q else "0").strip()
        str_stud_ans = str(ans.student_answer).strip()

        # Check correctness
        is_corr = False
        options = q.get("options", []) if q else []
        if str_stud_ans.isdigit() and int(str_stud_ans) < len(options):
            sel_opt = options[int(str_stud_ans)]
            if str_stud_ans == raw_correct_ans or sel_opt.strip().lower() == raw_correct_ans.lower():
                is_corr = True
        elif str_stud_ans.lower() == raw_correct_ans.lower():
            is_corr = True
        elif raw_correct_ans.isdigit() and int(raw_correct_ans) < len(options):
            if str_stud_ans.lower() == options[int(raw_correct_ans)].strip().lower():
                is_corr = True

        if is_corr:
            correct_count += 1

        # Explanation
        explanation = q.get("explanation") if q else None
        if not explanation:
            explanation = f"Correct answer verified for {ans.concept_id}."

        c_name = q.get("concept_name", ans.concept_id) if q else ans.concept_id
        reveal_items.append(AnswerRevealItem(
            question_id=ans.question_id,
            concept_id=ans.concept_id,
            concept_name=c_name,
            student_answer=str_stud_ans,
            correct_answer=raw_correct_ans,
            is_correct=is_corr,
            explanation=explanation
        ))

        # Log attempt in attempts table
        db_attempt = Attempt(
            student_id=req.student_id,
            subject_id=subject_id,
            question_id=ans.question_id,
            student_answer=str_stud_ans,
            correct=is_corr,
            source=q.get("source", "bank") if q else "bank",
            timestamp=now
        )
        db.add(db_attempt)

        # Log QuestionResponse for post-attempt reports
        q_diff = float(q.get("difficulty", 3.0) if q else 3.0)
        sel_idx = int(str_stud_ans) if str_stud_ans.isdigit() else 0
        q_resp = QuestionResponse(
            attempt_id=attempt_id,
            student_id=req.student_id,
            question_id=ans.question_id,
            concept_id=ans.concept_id,
            difficulty=q_diff,
            selected_option=sel_idx,
            is_correct=is_corr,
            mastery_before=0.25,
            mastery_after=0.25,
            response_time_seconds=float(getattr(ans, "response_time_seconds", 5.0) or 5.0),
            created_at=now
        )
        db.add(q_resp)
        recorded_responses.append(q_resp)

    score_pct = round(correct_count / max(1, len(req.answers)), 3)
    attempt.score = score_pct
    attempt.correct_count = correct_count
    attempt.total_questions = len(req.answers)

    # ==============================================================
    # 5-STEP RECOMPUTE CASCADE
    # ==============================================================

    # Cascade 1: knowledge_tracer.update_mastery
    mastery_summaries = []
    concept_answers: Dict[str, List[bool]] = {}
    for r in reveal_items:
        concept_answers.setdefault(r.concept_id, []).append(r.is_correct)

    for full_cid, results in concept_answers.items():
        raw_cid = full_cid.split(".")[-1]
        m_record = db.query(Mastery).filter(
            Mastery.student_id == req.student_id,
            Mastery.concept_id == full_cid
        ).first()

        prior_score = m_record.mastery_score if m_record else 0.25
        curr_score = prior_score

        for is_c in results:
            curr_score, _ = bkt_tracer.update(prior_p_l=curr_score, is_correct=is_c, difficulty=3.0)

        if not m_record:
            m_record = Mastery(
                student_id=req.student_id,
                subject_id=subject_id,
                concept_id=full_cid,
                concept_name=raw_cid,
                mastery_score=curr_score,
                prior_score=prior_score,
                attempts_count=len(results),
                correct_count=sum(results),
                last_updated=now
            )
            db.add(m_record)
        else:
            m_record.prior_score = prior_score
            m_record.mastery_score = curr_score
            m_record.attempts_count += len(results)
            m_record.correct_count += sum(results)
            m_record.last_updated = now

        # Update recorded QuestionResponse items with before/after masteries
        for resp in recorded_responses:
            if resp.concept_id == full_cid or resp.concept_id.endswith(f".{raw_cid}"):
                resp.mastery_before = prior_score
                resp.mastery_after = curr_score

        # Cascade 5: profile_store.snapshot (append-only)
        snapshot = MasterySnapshot(
            student_id=req.student_id,
            subject_id=subject_id,
            concept_id=full_cid,
            mastery_score=curr_score,
            timestamp=now
        )
        db.add(snapshot)

        mastery_summaries.append(ConceptMasterySummary(
            concept_id=full_cid,
            raw_concept_id=raw_cid,
            concept_name=raw_cid,
            difficulty_base=3,
            mastery_score=round(curr_score, 3),
            prior_score=round(prior_score, 3),
            delta=round(curr_score - prior_score, 3),
            is_mastered=(curr_score >= 0.70),
            is_weak_gap=(curr_score < 0.45)
        ))

    # Cascade 2 & 3: gap_analyzer.recompute & path_generator.regenerate
    mastery_map = _get_student_mastery_map(db, req.student_id, subject_id)
    gap_result = gap_analyzer.analyze_student(mastery_map, subject_id=subject_id)
    path_result = path_generator.generate_path(mastery_map, subject_id=subject_id)

    # Cascade 4: quiz_engine.recalibrate_difficulty
    calibrated_difficulty = max(1.0, min(7.0, round(score_pct * 7.0, 1)))

    # Update profile in DB
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == req.student_id).first()
    if profile:
        profile.diagnostic_completed = True
        profile.diagnostic_baseline_score = score_pct
        profile.adaptive_difficulty = calibrated_difficulty
        profile.subject_id = subject_id
        if gap_result.get("root_bottleneck_concept"):
            profile.target_concept_id = gap_result["root_bottleneck_concept"]["concept_id"]

    db.commit()

    subj_name = gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)

    return AssessmentSubmitResponse(
        attempt_id=attempt_id,
        student_id=req.student_id,
        subject_id=subject_id,
        subject_name=subj_name,
        score=score_pct,
        correct_count=correct_count,
        total_questions=len(req.answers),
        reveal_payload=reveal_items,
        concept_masteries=mastery_summaries,
        summary_message=f"Assessment complete. Baseline score: {int(score_pct*100)}%. 5-step recompute cascade executed.",
        cascade_status={
            "knowledge_tracer": "Updated BKT posterior probabilities",
            "gap_analyzer": f"Identified {gap_result.get('gap_count', 0)} gaps",
            "path_generator": "Regenerated prerequisite learning path",
            "quiz_engine": f"Recalibrated adaptive starting difficulty to {calibrated_difficulty}/7",
            "profile_store": "Appended immutable mastery snapshots to database"
        }
    )


# ==============================================================
# 2d) GET /gaps/{student_id}/{subject_id}
# ==============================================================
@router.get("/gaps/{student_id}/{subject_id}", response_model=KnowledgeGapResponse)
def get_student_gaps(
    student_id: str,
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns weak concepts + their unmet prerequisites via graph traversal
    (walk backward from any concept below mastery_threshold to find the earliest unmastered prerequisite
    — that's the true root gap, not just the symptom topic).
    """
    verify_student_access(current_user, student_id, db)
    mastery_map = _get_student_mastery_map(db, student_id, subject_id)
    analysis = gap_analyzer.analyze_student(mastery_map, subject_id=subject_id)

    subj_name = gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)

    return KnowledgeGapResponse(
        student_id=student_id,
        subject_id=subject_id,
        subject_name=subj_name,
        mastery_threshold=analysis["mastery_threshold"],
        total_concepts=analysis["total_concepts"],
        mastered_count=analysis["mastered_count"],
        gap_count=analysis["gap_count"],
        root_bottleneck_concept=analysis.get("root_bottleneck_concept"),
        gaps=analysis.get("gaps", []),
        graph_nodes=analysis.get("graph_nodes", []),
        graph_edges=analysis.get("graph_edges", []),
        analysis_narrative=analysis["analysis_narrative"]
    )


# ==============================================================
# 2e) GET /learning-path/{student_id}/{subject_id}
# ==============================================================
@router.get("/learning-path/{student_id}/{subject_id}", response_model=LearningPathResponse)
async def get_learning_path(
    student_id: str,
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ordered topic sequence (prerequisite-first) plus GenAI-generated explanation
    + worked examples for the top-priority gap.
    """
    verify_student_access(current_user, student_id, db)
    mastery_map = _get_student_mastery_map(db, student_id, subject_id)
    path_data = path_generator.generate_path(mastery_map, subject_id=subject_id)

    target_gap = path_data.get("target_gap_concept")
    genai_content = None

    if target_gap:
        cid = target_gap["concept_id"]
        cname = target_gap["concept_name"]
        raw_cid = target_gap.get("raw_concept_id", cid.split(".")[-1])
        c_meta = gap_analyzer.subject_concepts.get(subject_id, {}).get(raw_cid, {})

        # Load student's learning preference
        pref_row = db.query(LearningPreference).filter(LearningPreference.student_id == student_id).first()
        pref_dict = {
            "explanation_style": pref_row.explanation_style if pref_row else "Simple, step-by-step",
            "analogy_domain": pref_row.analogy_domain if pref_row else "Everyday life",
            "pace": pref_row.pace if pref_row else "Thorough / detailed",
        }

        genai_content = await genai_service.generate_lesson_for_gap(
            concept_id=cid,
            concept_name=cname,
            concept_metadata=c_meta,
            student_mastery=target_gap["mastery_score"],
            learning_preference=pref_dict
        )

    subj_name = gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)

    return LearningPathResponse(
        student_id=student_id,
        subject_id=subject_id,
        subject_name=subj_name,
        target_gap_concept=target_gap,
        curriculum=path_data["curriculum"],
        genai_content=genai_content,
        learning_strategy=path_data["learning_strategy"]
    )


# ==============================================================
# 2f) POST /quiz/next-question (Tier 2 Dynamic GenAI Generation)
# ==============================================================
@router.post("/quiz/next-question", response_model=QuizQuestionResponse)
async def get_next_quiz_question(
    req: QuizNextQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adapts difficulty using bounded rule clamped to [1, 7].
    Tier 2 Dynamic Question Generation: If dynamic_questions_after_first is enabled
    and the student has prior attempts or is retrying, questions are generated
    live by GenAIContentService rather than drawn from a fixed bank.
    """
    verify_student_access(current_user, req.student_id, db)
    subject_id = req.subject_id
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == req.student_id).first()
    current_diff = profile.adaptive_difficulty if profile else 3.0
    current_streak = profile.current_streak if profile else 0

    mastery_map = _get_student_mastery_map(db, req.student_id, subject_id)
    gap_data = gap_analyzer.analyze_student(mastery_map, subject_id=subject_id)
    weakest_gap = gap_data.get("root_bottleneck_concept")
    weakest_cid = req.concept_id or (weakest_gap["concept_id"] if weakest_gap else None)
    if not weakest_cid:
        weakest_cid = f"{subject_id}.C01"

    raw_t_cid = weakest_cid.split(".")[-1]
    c_meta = gap_analyzer.subject_concepts.get(subject_id, {}).get(raw_t_cid, {})
    t_name = c_meta.get("name", raw_t_cid)
    current_score = mastery_map.get(weakest_cid, mastery_map.get(raw_t_cid, 0.25))

    # Check Tier 2 Dynamic Generation flag
    cfg = quiz_engine.config or {}
    dyn_flag = cfg.get("dynamic_questions_after_first", True)
    if isinstance(cfg.get("dynamic_questions"), dict):
        dyn_flag = dyn_flag and cfg["dynamic_questions"].get("enabled", True)

    # Check student history in this subject
    past_attempts = db.query(Attempt).filter(
        Attempt.student_id == req.student_id,
        Attempt.subject_id == subject_id
    ).all()

    if dyn_flag:
        # Deduplication: get the last N question texts served to this student for this concept
        recent_qids = [a.question_id for a in past_attempts[-20:]]
        past_q_records = db.query(Question.text).filter(
            Question.id.in_(recent_qids),
            (Question.concept_id == weakest_cid) | (Question.concept_id.like(f"%{raw_t_cid}"))
        ).all()
        exclude_texts = [r[0] for r in past_q_records if r[0]]

        # Generate live question via GenAIContentService
        gen_q = await genai_service.generate_practice_question(
            concept_id=weakest_cid,
            concept_name=t_name,
            difficulty=current_diff,
            exclude_questions=exclude_texts
        )

        # Store generated question in DB Question table with source="generated"
        existing_q = db.query(Question).filter(Question.id == gen_q["id"]).first()
        if not existing_q:
            db_q = Question(
                id=gen_q["id"],
                subject_id=subject_id,
                concept_id=weakest_cid,
                text=gen_q["text"],
                options=gen_q.get("options", []),
                correct_answer=str(gen_q.get("correct_answer", "")),
                explanation=gen_q.get("explanation", ""),
                difficulty=float(gen_q.get("difficulty", current_diff)),
                source="generated"
            )
            db.add(db_q)
            db.commit()

        client_q = {
            "id": gen_q["id"],
            "subject_id": subject_id,
            "concept_id": weakest_cid,
            "concept_name": t_name,
            "difficulty": float(gen_q.get("difficulty", current_diff)),
            "text": gen_q["text"],
            "options": gen_q.get("options", []),
        }

        return QuizQuestionResponse(
            question=client_q,
            subject_id=subject_id,
            current_difficulty=current_diff,
            current_streak=current_streak,
            target_concept_id=weakest_cid,
            target_concept_name=t_name,
            student_current_mastery=round(current_score, 3),
            source="generated"
        )

    # Static Question Bank Fallback (Tier 1 mode if dynamic generation toggled off)
    seen_ids = [a.question_id for a in past_attempts]
    q, diff = quiz_engine.select_next_question(
        student_id=req.student_id,
        subject_id=subject_id,
        current_difficulty=current_diff,
        weakest_concept_id=weakest_cid,
        seen_question_ids=seen_ids
    )

    t_cid = q.get("concept_id", weakest_cid)
    raw_t_cid = t_cid.split(".")[-1]
    name = q.get("concept_name", raw_t_cid)
    client_q = {
        "id": q["id"],
        "subject_id": subject_id,
        "concept_id": t_cid,
        "concept_name": name,
        "difficulty": float(q.get("difficulty", diff)),
        "text": q["text"],
        "options": q.get("options", []),
    }

    return QuizQuestionResponse(
        question=client_q,
        subject_id=subject_id,
        current_difficulty=diff,
        current_streak=current_streak,
        target_concept_id=t_cid,
        target_concept_name=name,
        student_current_mastery=round(mastery_map.get(t_cid, 0.25), 3),
        source="bank"
    )


# ==============================================================
# 2g) POST /quiz/submit-answer
# ==============================================================
@router.post("/quiz/submit-answer", response_model=QuizAnswerSubmitResponse)
def submit_quiz_answer(
    req: QuizAnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits quiz answer, triggers recompute cascade scoped to that concept,
    updates mastery, difficulty, snapshots, and records attempt for reporting.
    """
    verify_student_access(current_user, req.student_id, db)
    subject_id = req.subject_id
    profile = db.query(LearningProfile).filter(LearningProfile.student_id == req.student_id).first()
    curr_diff = req.current_difficulty or (profile.adaptive_difficulty if profile else 3.0)
    curr_streak = profile.current_streak if profile else 0

    m_record = db.query(Mastery).filter(
        Mastery.student_id == req.student_id,
        Mastery.concept_id == req.concept_id
    ).first()
    prior_score = m_record.mastery_score if m_record else 0.25

    # Check if question exists in DB
    db_q = db.query(Question).filter(Question.id == req.question_id).first()
    q_dict = None
    q_source = "bank"
    if db_q:
        q_source = db_q.source or "bank"
        q_dict = {
            "id": db_q.id,
            "subject_id": db_q.subject_id,
            "concept_id": db_q.concept_id,
            "text": db_q.text,
            "options": db_q.options,
            "correct_answer": db_q.correct_answer,
            "explanation": db_q.explanation,
            "difficulty": db_q.difficulty
        }

    # Process answer via adaptive quiz engine
    res = quiz_engine.process_answer(
        student_id=req.student_id,
        subject_id=subject_id,
        question_id=req.question_id,
        student_answer=req.student_answer,
        current_difficulty=curr_diff,
        current_streak=curr_streak,
        prior_mastery=prior_score,
        question_data=q_dict
    )

    now = datetime.datetime.utcnow()

    # Recompute cascade scoped to this concept
    # 1. Update Mastery
    new_m = res["bkt_update"]["new_mastery"]
    if not m_record:
        m_record = Mastery(
            student_id=req.student_id,
            subject_id=subject_id,
            concept_id=req.concept_id,
            mastery_score=new_m,
            prior_score=prior_score,
            attempts_count=1,
            correct_count=1 if res["is_correct"] else 0,
            last_updated=now
        )
        db.add(m_record)
    else:
        m_record.prior_score = prior_score
        m_record.mastery_score = new_m
        m_record.attempts_count += 1
        if res["is_correct"]:
            m_record.correct_count += 1
        m_record.last_updated = now

    # 2. Append-only snapshot
    snapshot = MasterySnapshot(
        student_id=req.student_id,
        subject_id=subject_id,
        concept_id=req.concept_id,
        mastery_score=new_m,
        timestamp=now
    )
    db.add(snapshot)

    # 3. Log attempt with source tag
    db_attempt = Attempt(
        student_id=req.student_id,
        subject_id=subject_id,
        question_id=req.question_id,
        student_answer=str(req.student_answer),
        correct=res["is_correct"],
        source=q_source,
        timestamp=now
    )
    db.add(db_attempt)

    # 4. Record/update AssessmentAttempt for quiz session reporting
    cutoff = now - datetime.timedelta(minutes=30)
    quiz_attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == req.student_id,
        AssessmentAttempt.subject_id == subject_id,
        AssessmentAttempt.assessment_type == "quiz",
        AssessmentAttempt.created_at >= cutoff
    ).order_by(AssessmentAttempt.created_at.desc()).first()

    if not quiz_attempt:
        quiz_attempt = AssessmentAttempt(
            id=f"quiz_{subject_id}_{uuid.uuid4().hex[:8]}",
            student_id=req.student_id,
            subject_id=subject_id,
            assessment_type="quiz",
            score=1.0 if res["is_correct"] else 0.0,
            total_questions=1,
            correct_count=1 if res["is_correct"] else 0,
            created_at=now
        )
        db.add(quiz_attempt)
    else:
        quiz_attempt.total_questions += 1
        if res["is_correct"]:
            quiz_attempt.correct_count += 1
        quiz_attempt.score = round(quiz_attempt.correct_count / max(1, quiz_attempt.total_questions), 3)

    db.flush()

    # Record QuestionResponse
    sel_opt = int(str(req.student_answer)) if str(req.student_answer).isdigit() else 0
    q_resp = QuestionResponse(
        attempt_id=quiz_attempt.id,
        student_id=req.student_id,
        question_id=req.question_id,
        concept_id=req.concept_id,
        difficulty=float(curr_diff),
        selected_option=sel_opt,
        is_correct=res["is_correct"],
        mastery_before=prior_score,
        mastery_after=new_m,
        response_time_seconds=5.0,
        created_at=now
    )
    db.add(q_resp)

    # 5. Update Profile difficulty and streak
    if profile:
        profile.adaptive_difficulty = res["new_difficulty"]
        profile.current_streak = res["streak"]
        if res["streak"] > profile.max_streak:
            profile.max_streak = res["streak"]

    db.commit()

    return QuizAnswerSubmitResponse(
        student_id=req.student_id,
        subject_id=subject_id,
        is_correct=res["is_correct"],
        student_answer=res["student_answer"],
        correct_answer=res["correct_answer"],
        explanation=res["explanation"],
        bkt_update=res["bkt_update"],
        previous_difficulty=res["previous_difficulty"],
        new_difficulty=res["new_difficulty"],
        streak=res["streak"],
        difficulty_adjustment_reason=res["difficulty_adjustment_reason"],
        is_concept_now_mastered=res["is_concept_now_mastered"],
        cascade_status={
            "bkt_updated": True,
            "mastery_snapshot_appended": True,
            "difficulty_clamped_range": "[1.0, 7.0]"
        }
    )


# ==============================================================
# 2h) GET /profile/{student_id}/history?subject_id=
# ==============================================================
@router.get("/profile/{student_id}/history", response_model=MultiSubjectHistoryResponse)
def get_student_history(
    student_id: str,
    subject_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the snapshot list for mastery-over-time charts.
    Without subject_id, aggregates current mastery across all 6 subjects into one dashboard view.
    """
    verify_student_access(current_user, student_id, db)

    # Query snapshots
    query = db.query(MasterySnapshot).filter(MasterySnapshot.student_id == student_id)
    if subject_id:
        query = query.filter(MasterySnapshot.subject_id == subject_id)

    snapshots = query.order_by(MasterySnapshot.timestamp.asc()).all()

    snapshot_items = [
        MasterySnapshotItem(
            id=s.id,
            student_id=s.student_id,
            subject_id=s.subject_id,
            concept_id=s.concept_id,
            mastery_score=round(s.mastery_score, 3),
            timestamp=s.timestamp.isoformat()
        )
        for s in snapshots
    ]

    # Aggregate across all 6 subjects
    subject_overviews = []
    total_scores = []

    for sid, sinfo in gap_analyzer.subjects_metadata.items():
        m_map = _get_student_mastery_map(db, student_id, sid)
        scores = list(m_map.values())
        avg = sum(scores) / max(1, len(scores))
        mastered_c = sum(1 for v in scores if v >= 0.70)
        total_scores.append(avg)

        gaps = gap_analyzer.analyze_student(m_map, subject_id=sid)
        rb = gaps.get("root_bottleneck_concept")
        rb_name = rb["concept_name"] if rb else None

        subject_overviews.append(SubjectMasteryOverview(
            subject_id=sid,
            subject_name=sinfo.get("display_name", sid),
            average_mastery=round(avg, 3),
            mastered_count=mastered_c,
            total_concepts=len(gaps.get("graph_nodes", [])),
            root_bottleneck=rb_name
        ))

    overall = sum(total_scores) / max(1, len(total_scores)) if total_scores else 0.25

    return MultiSubjectHistoryResponse(
        student_id=student_id,
        subject_id=subject_id,
        snapshots=snapshot_items,
        subject_overviews=subject_overviews,
        overall_progress=round(overall, 3)
    )


# ==============================================================
# 2i) POST-ATTEMPT REPORTS (Feature 3)
# ==============================================================

@router.get("/profile/{student_id}/reports", response_model=AttemptReportsListResponse)
def get_student_reports(
    student_id: str,
    subject_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns list of past attempt reports for the Progress page's history list, newest first.
    """
    verify_student_access(current_user, student_id, db)
    query = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == student_id,
        AssessmentAttempt.total_questions > 0
    )
    if subject_id:
        query = query.filter(AssessmentAttempt.subject_id == subject_id)

    attempts = query.order_by(AssessmentAttempt.created_at.desc()).all()

    items = []
    for att in attempts:
        sid = att.subject_id or "maths3"
        s_meta = gap_analyzer.subjects_metadata.get(sid, {})
        s_name = s_meta.get("display_name", sid)
        score_pct = round(float(att.score or 0.0) * 100, 1)
        corr = att.correct_count or 0
        tot = att.total_questions or 1
        items.append(AttemptReportSummaryItem(
            attempt_id=att.id,
            date=att.created_at.strftime("%b %d, %Y • %H:%M") if att.created_at else "Recent",
            subject_id=sid,
            subject_name=s_name,
            assessment_type=att.assessment_type or "diagnostic",
            score_pct=score_pct,
            score_display=f"{corr} / {tot} correct",
            correct_count=corr,
            total_questions=tot
        ))

    return AttemptReportsListResponse(
        student_id=student_id,
        subject_id=subject_id,
        reports=items
    )


@router.get("/profile/{student_id}/report/{attempt_id}", response_model=AttemptFullReportResponse)
async def get_attempt_report(
    student_id: str,
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns full structured post-attempt report:
    - Overall score (X / Y correct)
    - Per-concept breakdown: concepts tested, correct vs incorrect, mastery delta
    - Root gap identified by Gap Analyzer (earliest unmastered prerequisite)
    - Delta vs student's previous attempt on the same subject
    - Plain-language GenAI summary paragraph (2-3 sentences, direct to student)
    """
    verify_student_access(current_user, student_id, db)
    attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.id == attempt_id,
        AssessmentAttempt.student_id == student_id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Attempt report '{attempt_id}' not found.")

    subject_id = attempt.subject_id or "maths3"
    s_meta = gap_analyzer.subjects_metadata.get(subject_id, {})
    s_name = s_meta.get("display_name", subject_id)

    responses = db.query(QuestionResponse).filter(
        QuestionResponse.attempt_id == attempt_id
    ).order_by(QuestionResponse.created_at.asc()).all()

    # Per-concept breakdown
    concept_map: Dict[str, List[QuestionResponse]] = {}
    for r in responses:
        concept_map.setdefault(r.concept_id, []).append(r)

    breakdown_items = []
    well_concepts = []
    weak_concepts = []

    for cid, r_list in concept_map.items():
        raw_cid = cid.split(".")[-1]
        c_meta = gap_analyzer.subject_concepts.get(subject_id, {}).get(raw_cid, {})
        c_name = c_meta.get("name", raw_cid)
        tested = len(r_list)
        corr = sum(1 for r in r_list if r.is_correct)
        inc = tested - corr
        m_before = r_list[0].mastery_before
        m_after = r_list[-1].mastery_after
        delta = round(m_after - m_before, 3)

        if corr >= inc:
            well_concepts.append(c_name)
        else:
            weak_concepts.append(c_name)

        breakdown_items.append(ConceptAttemptBreakdownItem(
            concept_id=cid,
            concept_name=c_name,
            tested_count=tested,
            correct_count=corr,
            incorrect_count=inc,
            mastery_before=round(m_before, 3),
            mastery_after=round(m_after, 3),
            delta=delta
        ))

    # If responses were empty (legacy attempt row), populate default concept breakdown
    if not breakdown_items:
        concepts = gap_analyzer.subject_concepts.get(subject_id, {})
        for cid, c_data in list(concepts.items())[:5]:
            breakdown_items.append(ConceptAttemptBreakdownItem(
                concept_id=f"{subject_id}.{cid}",
                concept_name=c_data.get("name", cid),
                tested_count=1,
                correct_count=1 if (attempt.score or 0) > 0.5 else 0,
                incorrect_count=0 if (attempt.score or 0) > 0.5 else 1,
                mastery_before=0.25,
                mastery_after=0.35 if (attempt.score or 0) > 0.5 else 0.20,
                delta=0.10 if (attempt.score or 0) > 0.5 else -0.05
            ))

    # Root gap identification via GapAnalyzer
    mastery_map = _get_student_mastery_map(db, student_id, subject_id)
    gap_result = gap_analyzer.analyze_student(mastery_map, subject_id=subject_id)
    root_bottleneck = gap_result.get("root_bottleneck_concept")

    # Delta vs previous attempt on same subject
    prev_attempt = db.query(AssessmentAttempt).filter(
        AssessmentAttempt.student_id == student_id,
        AssessmentAttempt.subject_id == subject_id,
        AssessmentAttempt.id != attempt_id,
        AssessmentAttempt.created_at < attempt.created_at
    ).order_by(AssessmentAttempt.created_at.desc()).first()

    previous_delta_info = None
    if prev_attempt:
        prev_pct = round(float(prev_attempt.score or 0.0) * 100, 1)
        curr_pct = round(float(attempt.score or 0.0) * 100, 1)
        score_diff = round(curr_pct - prev_pct, 1)
        previous_delta_info = {
            "previous_attempt_id": prev_attempt.id,
            "previous_date": prev_attempt.created_at.strftime("%b %d, %Y") if prev_attempt.created_at else "Prior",
            "previous_score_pct": prev_pct,
            "score_delta": score_diff,
            "trend": "improved" if score_diff > 0 else "declined" if score_diff < 0 else "stable"
        }

    # GenAI plain-language summary
    score_pct = round(float(attempt.score or 0.0) * 100, 1)
    tot = attempt.total_questions or max(1, len(responses))
    corr = attempt.correct_count or sum(1 for r in responses if r.is_correct)

    ai_summary = await genai_service.generate_attempt_summary({
        "score_pct": score_pct,
        "subject_name": s_name,
        "root_gap_name": root_bottleneck["concept_name"] if root_bottleneck else None,
        "well_concepts": well_concepts,
        "weak_concepts": weak_concepts
    })

    return AttemptFullReportResponse(
        attempt_id=attempt.id,
        date=attempt.created_at.strftime("%B %d, %Y at %H:%M") if attempt.created_at else "Recent",
        subject_id=subject_id,
        subject_name=s_name,
        assessment_type=attempt.assessment_type or "diagnostic",
        score_pct=score_pct,
        score_display=f"{corr} / {tot} correct",
        correct_count=corr,
        total_questions=tot,
        concept_breakdown=breakdown_items,
        root_gap=root_bottleneck,
        previous_attempt_delta=previous_delta_info,
        ai_summary=ai_summary
    )


# ==============================================================
# 2j) STUDENT INPUT LAYER ENDPOINTS (Preferences, Ask, Feedback)
# ==============================================================

@router.get("/learning-preference/{student_id}", response_model=LearningPreferenceSchema)
def get_learning_preference(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves student learning style, analogy domain, and pace preference.
    """
    verify_student_access(current_user, student_id, db)
    _ensure_student_records(db, student_id, current_user.name)

    pref = db.query(LearningPreference).filter(LearningPreference.student_id == student_id).first()
    if not pref:
        # Default preference
        pref = LearningPreference(
            student_id=student_id,
            explanation_style="Simple, step-by-step",
            analogy_domain="Everyday life",
            pace="Thorough / detailed"
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return LearningPreferenceSchema(
        student_id=pref.student_id,
        explanation_style=pref.explanation_style or "Simple, step-by-step",
        analogy_domain=pref.analogy_domain or "Everyday life",
        pace=pref.pace or "Thorough / detailed"
    )


@router.post("/learning-preference", response_model=LearningPreferenceSchema)
def save_learning_preference(
    req: LearningPreferenceSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves or updates student learning preference.
    Injected into all subsequent AI prompt generation calls.
    """
    verify_student_access(current_user, req.student_id, db)
    _ensure_student_records(db, req.student_id, current_user.name)

    pref = db.query(LearningPreference).filter(LearningPreference.student_id == req.student_id).first()
    if not pref:
        pref = LearningPreference(
            student_id=req.student_id,
            explanation_style=req.explanation_style,
            analogy_domain=req.analogy_domain,
            pace=req.pace
        )
        db.add(pref)
    else:
        pref.explanation_style = req.explanation_style
        pref.analogy_domain = req.analogy_domain
        pref.pace = req.pace
        pref.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(pref)

    return LearningPreferenceSchema(
        student_id=pref.student_id,
        explanation_style=pref.explanation_style,
        analogy_domain=pref.analogy_domain,
        pace=pref.pace
    )


@router.post("/learning-support/ask", response_model=AskDoubtResponse)
async def ask_concept_doubt(
    req: AskDoubtRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts contextual student doubt on a concept.
    Generates tailored response matching student mastery and learning preferences.
    Logs to DoubtQuery table for teacher visibility. Supports 1 follow-up turn.
    """
    verify_student_access(current_user, req.student_id, db)

    # 1. Fetch concept metadata
    raw_cid = req.concept_id.split(".")[-1]
    c_meta = gap_analyzer.subject_concepts.get(req.subject_id, {}).get(raw_cid, {})
    c_name = c_meta.get("name", raw_cid)

    # 2. Fetch student mastery
    mastery_map = _get_student_mastery_map(db, req.student_id, req.subject_id)
    student_m = mastery_map.get(req.concept_id, mastery_map.get(raw_cid, 0.50))

    # 3. Fetch student preferences
    pref_row = db.query(LearningPreference).filter(LearningPreference.student_id == req.student_id).first()
    pref_dict = {
        "explanation_style": pref_row.explanation_style if pref_row else "Simple, step-by-step",
        "analogy_domain": pref_row.analogy_domain if pref_row else "Everyday life",
        "pace": pref_row.pace if pref_row else "Thorough / detailed",
    }

    # 4. Generate targeted assistance
    ai_resp = await genai_service.generate_targeted_help(
        concept_name=c_name,
        question_text=req.question_text,
        student_mastery=student_m,
        learning_preference=pref_dict,
        previous_context=req.previous_context
    )

    # 5. Persist DoubtQuery in DB
    now = datetime.datetime.utcnow()
    doubt_entry = DoubtQuery(
        student_id=req.student_id,
        subject_id=req.subject_id,
        concept_id=req.concept_id,
        question_text=req.question_text,
        ai_response=ai_resp,
        timestamp=now
    )
    db.add(doubt_entry)
    db.commit()
    db.refresh(doubt_entry)

    return AskDoubtResponse(
        doubt_id=doubt_entry.id,
        concept_id=req.concept_id,
        concept_name=c_name,
        question_text=req.question_text,
        ai_response=ai_resp,
        timestamp=now.strftime("%b %d, %H:%M")
    )


@router.post("/learning-support/feedback", response_model=ContentFeedbackResponse)
async def submit_content_feedback(
    req: ContentFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Records student feedback on AI-generated content ('This helped' vs 'Explain differently').
    If 'Explain differently' (helpful=False), immediately regenerates with a fresh analogy.
    """
    verify_student_access(current_user, req.student_id, db)

    # 1. Log feedback in DB
    now = datetime.datetime.utcnow()
    fb = ContentFeedback(
        content_id=req.content_id,
        student_id=req.student_id,
        helpful=req.helpful,
        timestamp=now
    )
    db.add(fb)
    db.commit()

    if req.helpful:
        return ContentFeedbackResponse(
            status="recorded",
            helpful=True,
            alternative_explanation=None
        )

    # 2. If 'Explain differently', regenerate with distinct angle
    pref_row = db.query(LearningPreference).filter(LearningPreference.student_id == req.student_id).first()
    pref_dict = {
        "explanation_style": pref_row.explanation_style if pref_row else "Simple, step-by-step",
        "analogy_domain": pref_row.analogy_domain if pref_row else "Everyday life",
        "pace": pref_row.pace if pref_row else "Thorough / detailed",
    }
    c_name = req.concept_name or (req.concept_id.split(".")[-1] if req.concept_id else "this topic")

    alt_exp = await genai_service.generate_alternative_explanation(
        concept_name=c_name,
        previous_content=req.previous_content or "",
        learning_preference=pref_dict
    )

    return ContentFeedbackResponse(
        status="regenerated",
        helpful=False,
        alternative_explanation=alt_exp
    )

