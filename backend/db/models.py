import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.db.session import Base


# ==============================================================
# SECTION 5 DATA MODELS (Role-based & Multi-subject)
# ==============================================================

class User(Base):
    """User model supporting both 'student' and 'teacher' roles."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    role = Column(String, default="student", index=True)  # 'student' | 'teacher'
    class_id = Column(String, default="CS-2026", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Subject(Base):
    """Subject model representing the 6 platform subjects."""
    __tablename__ = "subjects"

    id = Column(String, primary_key=True, index=True)  # e.g. 'maths3', 'automata_theory'
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)


class Concept(Base):
    """Concept node in a subject's prerequisite DAG."""
    __tablename__ = "concepts"

    id = Column(String, primary_key=True, index=True)  # namespaced as '<subject_id>.<concept_id>'
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    prerequisites = Column(JSON, default=list)  # list of concept_ids
    difficulty_base = Column(Integer, default=3)  # 1 to 7


class Question(Base):
    """Question bank item mapped to a concept."""
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False, index=True)
    concept_id = Column(String, nullable=False, index=True)
    text = Column(Text, nullable=False)
    options = Column(JSON, default=list)  # list of option strings
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(Float, default=3.0)  # 1 to 7
    source = Column(String, default="bank")  # 'bank' | 'generated'


class Attempt(Base):
    """Record of a student's answer to an assessment or quiz question."""
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    subject_id = Column(String, nullable=False, index=True)
    question_id = Column(String, nullable=False, index=True)
    student_answer = Column(String, nullable=False)
    correct = Column(Boolean, nullable=False)
    source = Column(String, default="bank")  # 'bank' | 'generated'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class MasterySnapshot(Base):
    """Append-only snapshot of student mastery per concept over time."""
    __tablename__ = "mastery_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    subject_id = Column(String, nullable=False, index=True)
    concept_id = Column(String, nullable=False, index=True)
    mastery_score = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


# ==============================================================
# LEGACY / EXTENDED COMPATIBILITY MODELS
# ==============================================================

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    class_id = Column(String, default="CS-2026")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    masteries = relationship("Mastery", back_populates="student", cascade="all, delete-orphan")
    attempts = relationship("AssessmentAttempt", back_populates="student", cascade="all, delete-orphan")
    profile = relationship("LearningProfile", back_populates="student", uselist=False, cascade="all, delete-orphan")
    learning_path = relationship("LearningPathItem", back_populates="student", cascade="all, delete-orphan")


class Mastery(Base):
    __tablename__ = "masteries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    subject_id = Column(String, default="python", index=True)
    concept_id = Column(String, nullable=False, index=True)
    concept_name = Column(String, nullable=True)
    mastery_score = Column(Float, default=0.25)  # Current BKT probability P(L)
    prior_score = Column(Float, default=0.25)    # Score before the most recent update
    attempts_count = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="masteries")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    subject_id = Column(String, default="python")
    assessment_type = Column(String, nullable=False)  # 'diagnostic' or 'quiz'
    score = Column(Float, default=0.0)                # percentage or total correct
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="attempts")
    responses = relationship("QuestionResponse", back_populates="attempt", cascade="all, delete-orphan")


class QuestionResponse(Base):
    __tablename__ = "question_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(String, ForeignKey("assessment_attempts.id"), nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    question_id = Column(String, nullable=False)
    concept_id = Column(String, nullable=False)
    difficulty = Column(Float, default=3.0)
    selected_option = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    mastery_before = Column(Float, default=0.0)
    mastery_after = Column(Float, default=0.0)
    response_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    attempt = relationship("AssessmentAttempt", back_populates="responses")


class LearningProfile(Base):
    __tablename__ = "learning_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    subject_id = Column(String, default="python", index=True)
    current_streak = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    adaptive_difficulty = Column(Float, default=3.0)  # [1, 7] scale
    target_concept_id = Column(String, nullable=True)
    diagnostic_completed = Column(Boolean, default=False)
    diagnostic_baseline_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="profile")


class LearningPathItem(Base):
    __tablename__ = "learning_path_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    subject_id = Column(String, default="python", index=True)
    concept_id = Column(String, nullable=False)
    concept_name = Column(String, nullable=False)
    priority_score = Column(Float, default=0.0)
    status = Column(String, default="pending")  # 'pending', 'in_progress', 'mastered'
    sequence_order = Column(Integer, default=0)
    reason = Column(Text, nullable=True)

    student = relationship("Student", back_populates="learning_path")


# ==============================================================
# STUDENT INPUT LAYER MODELS
# ==============================================================

class LearningPreference(Base):
    """Student learning preference for AI-generated explanations and examples."""
    __tablename__ = "learning_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, ForeignKey("students.id"), unique=True, nullable=False, index=True)
    explanation_style = Column(String, default="Simple, step-by-step")
    analogy_domain = Column(String, default="Everyday life")
    pace = Column(String, default="Thorough / detailed")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class DoubtQuery(Base):
    """Contextual doubt/question asked by student on a concept."""
    __tablename__ = "doubt_queries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)
    subject_id = Column(String, nullable=False, index=True)
    concept_id = Column(String, nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class ContentFeedback(Base):
    """Feedback on AI-generated content ('This helped' vs 'Explain differently')."""
    __tablename__ = "content_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content_id = Column(String, nullable=False, index=True)
    student_id = Column(String, nullable=False, index=True)
    helpful = Column(Boolean, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
