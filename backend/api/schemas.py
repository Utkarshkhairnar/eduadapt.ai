from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


# ==============================================================
# SUBJECT & USER SCHEMAS
# ==============================================================

class SubjectInfo(BaseModel):
    id: str
    display_name: str
    description: Optional[str] = ""
    concepts_count: int = 7


class UserSchema(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    role: str = "student"  # 'student' | 'teacher'
    class_id: str = "CS-2026"


# ==============================================================
# QUESTION & REVEAL SCHEMAS
# ==============================================================

class QuestionSchema(BaseModel):
    id: str
    subject_id: Optional[str] = "python"
    concept_id: str
    concept_name: str
    difficulty: float
    text: str
    options: List[str]
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class AnswerRevealItem(BaseModel):
    question_id: str
    concept_id: str
    concept_name: str
    student_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str


# ==============================================================
# ASSESSMENT SCHEMAS
# ==============================================================

class AssessmentStartRequest(BaseModel):
    student_id: str = "demo-student-1"
    subject_id: str = "maths3"
    student_name: Optional[str] = "Alex Rivera"


class AssessmentStartResponse(BaseModel):
    attempt_id: str
    student_id: str
    subject_id: str
    subject_name: str
    questions: List[Dict[str, Any]]
    total_questions: int
    instructions: str


class AnswerSubmitItem(BaseModel):
    question_id: str
    concept_id: str
    student_answer: Union[str, int]
    response_time_seconds: Optional[float] = 5.0


class AssessmentSubmitRequest(BaseModel):
    student_id: str
    subject_id: str = "maths3"
    attempt_id: Optional[str] = None
    answers: List[AnswerSubmitItem]


class ConceptMasterySummary(BaseModel):
    concept_id: str
    raw_concept_id: str
    concept_name: str
    difficulty_base: int
    mastery_score: float
    prior_score: float
    delta: float
    is_mastered: bool
    is_weak_gap: bool


class AssessmentSubmitResponse(BaseModel):
    attempt_id: Optional[str] = None
    student_id: str
    subject_id: str
    subject_name: str
    score: float
    correct_count: int
    total_questions: int
    reveal_payload: List[AnswerRevealItem]
    concept_masteries: List[ConceptMasterySummary]
    summary_message: str
    cascade_status: Dict[str, Any]


# ==============================================================
# KNOWLEDGE GAPS & GRAPH SCHEMAS
# ==============================================================

class ConceptGapItem(BaseModel):
    concept_id: str
    raw_concept_id: str
    concept_name: str
    difficulty_base: int
    mastery_score: float
    is_gap: bool
    is_root_bottleneck: bool
    root_cause_id: Optional[str] = None
    unmet_prerequisites: List[str]
    blocking_for: List[str]
    gap_severity: float
    recommendation: str


class GraphNodeSchema(BaseModel):
    id: str
    raw_id: str
    name: str
    difficulty_base: int
    mastery_score: float
    status: str  # 'mastered', 'gap_bottleneck', 'gap_dependent', 'ready_to_learn'


class GraphEdgeSchema(BaseModel):
    source: str
    target: str
    is_blocking: bool


class KnowledgeGapResponse(BaseModel):
    student_id: str
    subject_id: str
    subject_name: str
    mastery_threshold: float
    total_concepts: int
    mastered_count: int
    gap_count: int
    root_bottleneck_concept: Optional[ConceptGapItem] = None
    gaps: List[ConceptGapItem]
    graph_nodes: List[GraphNodeSchema]
    graph_edges: List[GraphEdgeSchema]
    analysis_narrative: str


# ==============================================================
# LEARNING PATH SCHEMAS
# ==============================================================

class GenAIContentSchema(BaseModel):
    concept_id: str
    concept_name: str
    generated_at: str
    explanation: str
    mental_model_analogy: str
    worked_example: Dict[str, Any]
    common_pitfalls: List[str]
    practice_challenge: Dict[str, Any]


class LearningPathStep(BaseModel):
    sequence_order: int
    concept_id: str
    raw_concept_id: str
    concept_name: str
    difficulty_base: int
    priority_score: float
    current_mastery: float
    status: str
    reason: str
    prerequisites: List[str]


class LearningPathResponse(BaseModel):
    student_id: str
    subject_id: str
    subject_name: str
    target_gap_concept: Optional[ConceptGapItem] = None
    curriculum: List[LearningPathStep]
    genai_content: Optional[GenAIContentSchema] = None
    learning_strategy: str


# ==============================================================
# ADAPTIVE QUIZ SCHEMAS
# ==============================================================

class QuizNextQuestionRequest(BaseModel):
    student_id: str
    subject_id: str = "maths3"
    concept_id: Optional[str] = None


class QuizQuestionResponse(BaseModel):
    question: Dict[str, Any]
    subject_id: str
    current_difficulty: float
    current_streak: int
    target_concept_id: str
    target_concept_name: str
    student_current_mastery: float
    source: Optional[str] = "generated"  # 'bank' | 'generated'


class QuizAnswerSubmitRequest(BaseModel):
    student_id: str
    subject_id: str = "maths3"
    question_id: str
    concept_id: str
    student_answer: Union[str, int]
    current_difficulty: Optional[float] = 3.0


class BKTUpdateDetail(BaseModel):
    prior_mastery: float
    posterior_given_evidence: float
    transit_addition: float
    new_mastery: float
    delta: float
    formula_used: str
    effective_slip: float
    effective_guess: float


class QuizAnswerSubmitResponse(BaseModel):
    student_id: str
    subject_id: str
    is_correct: bool
    student_answer: str
    correct_answer: str
    explanation: str
    bkt_update: BKTUpdateDetail
    previous_difficulty: float
    new_difficulty: float
    streak: int
    difficulty_adjustment_reason: str
    is_concept_now_mastered: bool
    cascade_status: Dict[str, Any]


# ==============================================================
# PROFILE & HISTORY SCHEMAS
# ==============================================================

class MasterySnapshotItem(BaseModel):
    id: int
    student_id: str
    subject_id: str
    concept_id: str
    mastery_score: float
    timestamp: str


class SubjectMasteryOverview(BaseModel):
    subject_id: str
    subject_name: str
    average_mastery: float
    mastered_count: int
    total_concepts: int
    root_bottleneck: Optional[str] = None


class MultiSubjectHistoryResponse(BaseModel):
    student_id: str
    subject_id: Optional[str] = None
    snapshots: List[MasterySnapshotItem]
    subject_overviews: List[SubjectMasteryOverview]
    overall_progress: float


# ==============================================================
# TEACHER SCHEMAS
# ==============================================================

class StudentRosterItem(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    class_id: str
    diagnostic_completed: bool
    average_mastery: float
    recent_activity: Optional[str] = None


class HeatmapCell(BaseModel):
    student_id: str
    student_name: str
    concept_id: str
    concept_name: str
    mastery_score: float
    is_mastered: bool


class ClassHeatmapResponse(BaseModel):
    class_id: str
    subject_id: str
    subject_name: str
    concepts: List[Dict[str, Any]]
    students: List[Dict[str, Any]]
    matrix: List[List[float]]  # students x concepts mastery matrix
    class_average_mastery: float


class CommonGapItem(BaseModel):
    concept_id: str
    concept_name: str
    difficulty_base: int
    weak_student_count: int
    total_students: int
    weak_percentage: float
    is_root_bottleneck_for_many: bool


class CommonGapsResponse(BaseModel):
    class_id: str
    subject_id: str
    subject_name: str
    ranked_gaps: List[CommonGapItem]


# ==============================================================
# BACKWARD COMPATIBILITY ALIASES
# ==============================================================
DiagnosticStartRequest = AssessmentStartRequest
DiagnosticStartResponse = AssessmentStartResponse
DiagnosticSubmitRequest = AssessmentSubmitRequest
DiagnosticSubmitResponse = AssessmentSubmitResponse
AnswerItem = AnswerSubmitItem
QuizNextQuestionResponse = QuizQuestionResponse


class MasteryDeltaItem(BaseModel):
    concept_id: str
    concept_name: str
    baseline_mastery: float
    current_mastery: float
    delta: float
    status: str


class StudentProfileResponse(BaseModel):
    student_id: str
    name: str
    current_streak: int
    max_streak: int
    adaptive_difficulty: float
    diagnostic_completed: bool
    overall_mastery_average: float
    mastered_concepts_count: int
    total_concepts_count: int
    mastery_deltas: List[MasteryDeltaItem]
    recent_responses: List[Dict[str, Any]]
    readiness_level: str


# ==============================================================
# POST-ATTEMPT REPORT SCHEMAS (Feature 3)
# ==============================================================

class AttemptReportSummaryItem(BaseModel):
    attempt_id: str
    date: str
    subject_id: str
    subject_name: str
    assessment_type: str  # 'diagnostic' | 'quiz'
    score_pct: float
    score_display: str
    correct_count: int
    total_questions: int


class AttemptReportsListResponse(BaseModel):
    student_id: str
    subject_id: Optional[str] = None
    reports: List[AttemptReportSummaryItem]


class ConceptAttemptBreakdownItem(BaseModel):
    concept_id: str
    concept_name: str
    tested_count: int
    correct_count: int
    incorrect_count: int
    mastery_before: float
    mastery_after: float
    delta: float


class AttemptFullReportResponse(BaseModel):
    attempt_id: str
    date: str
    subject_id: str
    subject_name: str
    assessment_type: str
    score_pct: float
    score_display: str
    correct_count: int
    total_questions: int
    concept_breakdown: List[ConceptAttemptBreakdownItem]
    root_gap: Optional[Dict[str, Any]] = None
    previous_attempt_delta: Optional[Dict[str, Any]] = None
    ai_summary: str


# ==============================================================
# STUDENT INPUT LAYER SCHEMAS
# ==============================================================

class LearningPreferenceSchema(BaseModel):
    student_id: str
    explanation_style: str = "Simple, step-by-step"
    analogy_domain: str = "Everyday life"
    pace: str = "Thorough / detailed"


class AskDoubtRequest(BaseModel):
    student_id: str
    subject_id: str
    concept_id: str
    question_text: str
    previous_context: Optional[str] = None


class AskDoubtResponse(BaseModel):
    doubt_id: int
    concept_id: str
    concept_name: str
    question_text: str
    ai_response: str
    timestamp: str


class ContentFeedbackRequest(BaseModel):
    content_id: str
    student_id: str
    helpful: bool
    concept_name: Optional[str] = None
    concept_id: Optional[str] = None
    previous_content: Optional[str] = None


class ContentFeedbackResponse(BaseModel):
    status: str
    helpful: bool
    alternative_explanation: Optional[str] = None


class DoubtQueryItem(BaseModel):
    id: int
    student_id: str
    subject_id: str
    concept_id: str
    concept_name: Optional[str] = None
    question_text: str
    ai_response: str
    timestamp: str


