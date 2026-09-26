import os
import sys
import datetime
import random

workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

from backend.db.session import SessionLocal, init_db
from backend.db.models import (
    User, Subject, Concept, Question, Attempt, MasterySnapshot,
    Student, Mastery, LearningProfile
)
from backend.core.gap_analyzer import GapAnalyzer
from backend.core.quiz_engine import AdaptiveQuizEngine

gap_analyzer = GapAnalyzer()
quiz_engine = AdaptiveQuizEngine()


def seed_database():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()

    print("Seeding subjects and concepts...")
    for sid, sdata in gap_analyzer.subjects_metadata.items():
        existing_s = db.query(Subject).filter(Subject.id == sid).first()
        if not existing_s:
            db_s = Subject(
                id=sid,
                display_name=sdata.get("display_name", sid),
                description=sdata.get("description", "")
            )
            db.add(db_s)

        dag = gap_analyzer.subject_dags.get(sid)
        if dag:
            for full_cid, node in dag.nodes(data=True):
                raw_id = node.get("raw_id", full_cid.split(".")[-1])
                existing_c = db.query(Concept).filter(Concept.id == full_cid).first()
                if not existing_c:
                    prereqs = [dag.nodes[p].get("raw_id", p) for p in dag.predecessors(full_cid)]
                    db_c = Concept(
                        id=full_cid,
                        subject_id=sid,
                        name=node.get("name", raw_id),
                        prerequisites=prereqs,
                        difficulty_base=node.get("difficulty_base", 3)
                    )
                    db.add(db_c)
    db.commit()

    print("Seeding questions from question banks...")
    for sid in gap_analyzer.subjects_metadata.keys():
        questions = quiz_engine.get_subject_questions(sid)
        for q in questions:
            existing_q = db.query(Question).filter(Question.id == q["id"]).first()
            if not existing_q:
                db_q = Question(
                    id=q["id"],
                    subject_id=sid,
                    concept_id=q.get("concept_id", f"{sid}.C01"),
                    text=q["text"],
                    options=q.get("options", []),
                    correct_answer=str(q.get("correct_answer", "0")),
                    explanation=q.get("explanation", ""),
                    difficulty=float(q.get("difficulty", 3.0))
                )
                db.add(db_q)
    db.commit()

    print("Seeding users (1 teacher, 6 students)...")
    # Teacher
    teacher = db.query(User).filter(User.id == "teacher_1").first()
    if not teacher:
        teacher = User(
            id="teacher_1",
            name="Prof. Sharma",
            email="prof.sharma@eduadapt.ai",
            role="teacher",
            class_id="CS-2026"
        )
        db.add(teacher)

    # 6 Students
    students_data = [
        {"id": "student_1", "name": "Alex Rivera", "email": "alex.r@eduadapt.ai", "class_id": "CS-2026"},
        {"id": "student_2", "name": "Priya Patel", "email": "priya.p@eduadapt.ai", "class_id": "CS-2026"},
        {"id": "student_3", "name": "Marcus Chen", "email": "marcus.c@eduadapt.ai", "class_id": "CS-2026"},
        {"id": "student_4", "name": "Elena Rostova", "email": "elena.r@eduadapt.ai", "class_id": "CS-2026"},
        {"id": "student_5", "name": "David Kim", "email": "david.k@eduadapt.ai", "class_id": "CS-2026"},
        {"id": "student_6", "name": "Fatima Al-Mansoor", "email": "fatima.m@eduadapt.ai", "class_id": "CS-2026"},
    ]

    for s in students_data:
        db_user = db.query(User).filter(User.id == s["id"]).first()
        if not db_user:
            db_user = User(
                id=s["id"],
                name=s["name"],
                email=s["email"],
                role="student",
                class_id=s["class_id"]
            )
            db.add(db_user)

        db_student = db.query(Student).filter(Student.id == s["id"]).first()
        if not db_student:
            db_student = Student(
                id=s["id"],
                name=s["name"],
                email=s["email"],
                class_id=s["class_id"]
            )
            db.add(db_student)

        db_profile = db.query(LearningProfile).filter(LearningProfile.student_id == s["id"]).first()
        if not db_profile:
            db_profile = LearningProfile(
                student_id=s["id"],
                current_streak=random.randint(1, 5),
                max_streak=random.randint(3, 7),
                adaptive_difficulty=round(random.uniform(2.5, 5.0), 1),
                diagnostic_completed=True,
                diagnostic_baseline_score=round(random.uniform(0.55, 0.85), 2)
            )
            db.add(db_profile)
    db.commit()

    print("Seeding mastery profiles, historical snapshots, and attempts across all 6 subjects...")
    # Student mastery profiles with realistic subject variations
    # Student 1: High in python, c_programming; medium in maths3
    # Student 2: High in automata_theory, java; low in adsa
    # Student 3: High in adsa, python; low in maths3 (Fourier)
    # Student 4: High in java; medium in c_programming
    # Student 5: Developing all round (lower scores)
    # Student 6: High in adsa, maths3; low in automata_theory
    student_biases = {
        "student_1": {"python": 0.85, "c_programming": 0.82, "maths3": 0.50, "automata_theory": 0.60, "adsa": 0.72, "java": 0.65},
        "student_2": {"automata_theory": 0.88, "java": 0.84, "adsa": 0.42, "python": 0.68, "c_programming": 0.55, "maths3": 0.60},
        "student_3": {"adsa": 0.86, "python": 0.80, "maths3": 0.45, "java": 0.70, "c_programming": 0.62, "automata_theory": 0.64},
        "student_4": {"java": 0.85, "c_programming": 0.52, "maths3": 0.65, "automata_theory": 0.60, "adsa": 0.58, "python": 0.62},
        "student_5": {"python": 0.48, "c_programming": 0.45, "maths3": 0.42, "automata_theory": 0.38, "adsa": 0.40, "java": 0.46},
        "student_6": {"adsa": 0.82, "maths3": 0.80, "automata_theory": 0.44, "java": 0.68, "c_programming": 0.70, "python": 0.75},
    }

    base_time = datetime.datetime.utcnow() - datetime.timedelta(days=7)

    for s in students_data:
        s_id = s["id"]
        biases = student_biases.get(s_id, {})

        for sid, sdata in gap_analyzer.subjects_metadata.items():
            base_subj_mastery = biases.get(sid, 0.55)
            dag = gap_analyzer.subject_dags.get(sid)
            questions = quiz_engine.get_subject_questions(sid)

            if not dag:
                continue

            for idx, (full_cid, node) in enumerate(dag.nodes(data=True)):
                raw_id = node.get("raw_id", full_cid.split(".")[-1])
                diff = node.get("difficulty_base", 3)

                # Concept score varies around base_subj_mastery modulated by difficulty
                score = max(0.15, min(0.95, base_subj_mastery + random.uniform(-0.15, 0.15) - (diff - 3) * 0.05))

                # Save Mastery
                m = db.query(Mastery).filter(
                    Mastery.student_id == s_id,
                    Mastery.concept_id == full_cid
                ).first()
                if not m:
                    m = Mastery(
                        student_id=s_id,
                        subject_id=sid,
                        concept_id=full_cid,
                        concept_name=node.get("name", raw_id),
                        mastery_score=round(score, 3),
                        prior_score=round(max(0.1, score - 0.18), 3),
                        attempts_count=random.randint(2, 6),
                        correct_count=random.randint(1, 4),
                        last_updated=datetime.datetime.utcnow()
                    )
                    db.add(m)

                # Create 3 historical snapshots over past 7 days to power progress-over-time charts
                for step_idx in range(3):
                    snap_time = base_time + datetime.timedelta(days=step_idx * 2 + random.uniform(0.1, 0.8))
                    snap_val = max(0.10, min(0.95, score - (2 - step_idx) * 0.12 + random.uniform(-0.04, 0.04)))
                    snap = MasterySnapshot(
                        student_id=s_id,
                        subject_id=sid,
                        concept_id=full_cid,
                        mastery_score=round(snap_val, 3),
                        timestamp=snap_time
                    )
                    db.add(snap)

                # Seed 1-2 attempts
                if questions:
                    matching_q = [q for q in questions if q.get("concept_id") == full_cid or q.get("raw_concept_id") == raw_id]
                    sample_q = matching_q[0] if matching_q else questions[0]
                    att = Attempt(
                        student_id=s_id,
                        subject_id=sid,
                        question_id=sample_q["id"],
                        student_answer=sample_q.get("options", ["0"])[0],
                        correct=(score >= 0.50),
                        timestamp=base_time + datetime.timedelta(days=random.randint(1, 6))
                    )
                    db.add(att)

    db.commit()
    db.close()
    print("Database seeding completed successfully! Ready for demo.")


if __name__ == "__main__":
    seed_database()
