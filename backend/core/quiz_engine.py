import os
import json
import yaml
from typing import Dict, List, Any, Optional, Tuple
from backend.core.knowledge_tracer import BayesianKnowledgeTracer

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
QUESTION_BANKS_DIR = os.path.join(DATA_DIR, "question_banks")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "configs", "default.yaml")


class AdaptiveQuizEngine:
    """
    Adaptive quiz engine supporting multi-subject question banks.
    Adapts difficulty using a bounded rule clamped to [1, 7]:
      next_difficulty = current_difficulty + step * (+1 if last correct else -1), clamped to [1, 7]
    Biases question selection toward the student's current weakest concept in that subject.
    """

    def __init__(self, question_banks_dir: str = QUESTION_BANKS_DIR, config_path: str = CONFIG_PATH):
        self.question_banks_dir = question_banks_dir
        self.config_path = config_path

        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.min_diff = 1.0
        self.max_diff = 7.0
        self.diff_step = 1.0
        self.default_diff = 3.0

        self.bkt = BayesianKnowledgeTracer.from_config()
        self._cached_banks: Dict[str, List[Dict[str, Any]]] = {}

    def get_subject_questions(self, subject_id: str) -> List[Dict[str, Any]]:
        if subject_id in self._cached_banks:
            return self._cached_banks[subject_id]

        file_path = os.path.join(self.question_banks_dir, f"{subject_id}.json")
        if not os.path.exists(file_path):
            # Fallback legacy question_bank.json if available
            legacy_path = os.path.join(DATA_DIR, "question_bank.json")
            if os.path.exists(legacy_path):
                with open(legacy_path, "r") as f:
                    return json.load(f)
            return []

        try:
            with open(file_path, "r") as f:
                questions = json.load(f)
                self._cached_banks[subject_id] = questions
                return questions
        except Exception:
            return []

    def reload_subject(self, subject_id: str):
        if subject_id in self._cached_banks:
            del self._cached_banks[subject_id]

    def select_next_question(
        self,
        student_id: str,
        subject_id: str,
        current_difficulty: float,
        weakest_concept_id: Optional[str] = None,
        seen_question_ids: Optional[List[str]] = None,
    ) -> Tuple[Dict[str, Any], float]:
        """
        Selects next adaptive question.
        Biases selection toward the student's current weakest concept in that subject,
        and targets difficulty closest to current_difficulty.
        """
        questions = self.get_subject_questions(subject_id)
        if not questions:
            # Emergency fallback question
            return {
                "id": f"{subject_id}_q_fallback",
                "subject_id": subject_id,
                "concept_id": weakest_concept_id or f"{subject_id}.C01",
                "text": f"Sample concept mastery diagnostic question for {subject_id}?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A",
                "explanation": "Core theoretical principle.",
                "difficulty": current_difficulty
            }, current_difficulty

        seen = set(seen_question_ids or [])

        # Priority 1: Unseen questions on the weakest concept
        candidates = []
        if weakest_concept_id:
            # Handle both namespaced and raw concept ID
            raw_target = weakest_concept_id.split(".")[-1]
            candidates = [
                q for q in questions
                if (q.get("concept_id") == weakest_concept_id or
                    q.get("concept_id", "").endswith(f".{raw_target}") or
                    q.get("raw_concept_id") == raw_target)
                and q["id"] not in seen
            ]

        # Priority 2: Any unseen question in this subject
        if not candidates:
            candidates = [q for q in questions if q["id"] not in seen]

        # Priority 3: Re-use questions on the weakest concept if all questions seen
        if not candidates and weakest_concept_id:
            raw_target = weakest_concept_id.split(".")[-1]
            candidates = [
                q for q in questions
                if (q.get("concept_id") == weakest_concept_id or
                    q.get("raw_concept_id") == raw_target)
            ]

        # Priority 4: Re-use any question in this subject
        if not candidates:
            candidates = questions

        # Pick candidate with difficulty closest to current_difficulty
        best_question = min(candidates, key=lambda q: abs(float(q.get("difficulty", 3.0)) - current_difficulty))

        return best_question, round(current_difficulty, 1)

    def process_answer(
        self,
        student_id: str,
        subject_id: str,
        question_id: str,
        student_answer: Any,
        current_difficulty: float,
        current_streak: int,
        prior_mastery: float,
        question_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Processes answer, calculates bounded difficulty adjustment clamped to [1, 7],
        and updates BKT mastery.
        """
        question = question_data
        if not question:
            questions = self.get_subject_questions(subject_id)
            question = next((q for q in questions if q["id"] == question_id), None)

        if not question:
            # Generic fallback question
            question = {
                "id": question_id,
                "subject_id": subject_id,
                "concept_id": f"{subject_id}.C01",
                "correct_answer": "0",
                "explanation": "Correct answer evaluated.",
                "difficulty": current_difficulty,
            }

        # Compare answer
        correct_answer = str(question.get("correct_answer", "")).strip()
        str_student_answer = str(student_answer).strip()

        # Handle options indexing or exact string match
        is_correct = False
        options = question.get("options", [])
        if str_student_answer.isdigit() and int(str_student_answer) < len(options):
            # Check if option text or index matches
            selected_text = options[int(str_student_answer)]
            if str_student_answer == correct_answer or selected_text.strip().lower() == correct_answer.lower():
                is_correct = True
        elif str_student_answer.lower() == correct_answer.lower():
            is_correct = True
        elif correct_answer.isdigit() and int(correct_answer) < len(options):
            if str_student_answer.lower() == options[int(correct_answer)].strip().lower():
                is_correct = True

        # Bounded rule adjustment clamped to [1, 7]
        # next_difficulty = current_difficulty + step * (+1 if last correct else -1), clamped to [1, 7]
        if is_correct:
            new_streak = current_streak + 1 if current_streak >= 0 else 1
            raw_new_diff = current_difficulty + self.diff_step
            reason = f"Correct answer (+{self.diff_step:.1f} difficulty)"
        else:
            new_streak = current_streak - 1 if current_streak <= 0 else -1
            raw_new_diff = current_difficulty - self.diff_step
            reason = f"Incorrect answer (-{self.diff_step:.1f} difficulty dampening)"

        new_difficulty = max(self.min_diff, min(self.max_diff, raw_new_diff))

        # Update Bayesian Knowledge Tracing
        q_diff = float(question.get("difficulty", current_difficulty))
        new_mastery, bkt_details = self.bkt.update(
            prior_p_l=prior_mastery,
            is_correct=is_correct,
            difficulty=q_diff,
        )

        mastery_threshold = self.config.get("mastery", {}).get("threshold", 0.70)
        is_mastered_now = new_mastery >= mastery_threshold

        return {
            "student_id": student_id,
            "subject_id": subject_id,
            "question_id": question_id,
            "concept_id": question.get("concept_id"),
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "student_answer": str_student_answer,
            "explanation": question.get("explanation", "Verification completed."),
            "bkt_update": bkt_details,
            "previous_difficulty": round(current_difficulty, 1),
            "new_difficulty": round(new_difficulty, 1),
            "streak": new_streak,
            "difficulty_adjustment_reason": reason,
            "is_concept_now_mastered": is_mastered_now,
        }
