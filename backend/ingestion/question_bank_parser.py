import os
import json
import re
import yaml
from typing import List, Dict, Any, Optional
import pandas as pd

try:
    import docx
except ImportError:
    docx = None

try:
    import pypdf
except ImportError:
    pypdf = None


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
GRAPHS_DIR = os.path.join(DATA_DIR, "concept_graphs")
QUESTION_BANKS_DIR = os.path.join(DATA_DIR, "question_banks")
REGISTRY_PATH = os.path.join(GRAPHS_DIR, "subjects_registry.yaml")


class QuestionBankParser:
    """
    Parses CSV, PDF, and DOCX assessment question bank files,
    maps questions to concept IDs in the subject's concept graph,
    and saves to backend/data/question_banks/<subject_id>.json.
    """

    def __init__(self, registry_path: str = REGISTRY_PATH):
        self.registry_path = registry_path
        self.subjects = self._load_registry()

    def _load_registry(self) -> Dict[str, Any]:
        if os.path.exists(self.registry_path):
            with open(self.registry_path, "r") as f:
                data = yaml.safe_load(f)
                return {s["id"]: s for s in data.get("subjects", [])}
        return {}

    def get_subject_concepts(self, subject_id: str) -> List[Dict[str, Any]]:
        subject_info = self.subjects.get(subject_id)
        if not subject_info:
            return []
        graph_file = os.path.join(GRAPHS_DIR, subject_info["graph_file"])
        if not os.path.exists(graph_file):
            return []
        with open(graph_file, "r") as f:
            data = yaml.safe_load(f)
            return data.get("concepts", [])

    def map_concept(self, text: str, concepts: List[Dict[str, Any]], override_concept_id: Optional[str] = None) -> str:
        """
        Maps question text to a concept ID using keyword matching or override.
        """
        if override_concept_id:
            return override_concept_id

        if not concepts:
            return "C01"

        text_lower = text.lower()
        best_concept = concepts[0]["id"]
        best_score = 0

        for c in concepts:
            score = 0
            c_name_tokens = c["name"].lower().split()
            for token in c_name_tokens:
                if len(token) > 2 and token in text_lower:
                    score += 3

            c_desc = c.get("description", "").lower()
            for token in c_desc.split():
                if len(token) > 3 and token in text_lower:
                    score += 1

            if score > best_score:
                best_score = score
                best_concept = c["id"]

        return best_concept

    def parse_csv(self, file_content: bytes, subject_id: str, overrides: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Parses a CSV question bank."""
        import io
        df = pd.read_csv(io.BytesIO(file_content))
        concepts = self.get_subject_concepts(subject_id)
        overrides = overrides or {}

        questions = []
        for idx, row in df.iterrows():
            q_text = str(row.get("text") or row.get("question") or row.get("Question") or "").strip()
            if not q_text:
                continue

            # Parse options
            options = []
            if "options" in row and pd.notna(row["options"]):
                raw_opts = str(row["options"])
                if "|" in raw_opts:
                    options = [o.strip() for o in raw_opts.split("|") if o.strip()]
                elif ";" in raw_opts:
                    options = [o.strip() for o in raw_opts.split(";") if o.strip()]
                else:
                    options = [o.strip() for o in raw_opts.split(",") if o.strip()]
            else:
                for col in ["option_a", "option_b", "option_c", "option_d", "A", "B", "C", "D"]:
                    if col in row and pd.notna(row[col]):
                        options.append(str(row[col]).strip())

            if not options:
                options = ["Option A", "Option B", "Option C", "Option D"]

            correct_ans = str(row.get("correct_answer") or row.get("answer") or row.get("Correct") or "0").strip()
            explanation = str(row.get("explanation") or row.get("Explanation") or "").strip()
            difficulty = float(row.get("difficulty") or 3.0)

            # Manual override or automated concept matching
            concept_candidate = overrides.get(str(idx)) or overrides.get(q_text) or row.get("concept_id")
            concept_id = self.map_concept(q_text, concepts, concept_candidate)

            q_id = f"{subject_id}_q_{len(questions)+1}"
            questions.append({
                "id": q_id,
                "subject_id": subject_id,
                "concept_id": f"{subject_id}.{concept_id}" if not concept_id.startswith(f"{subject_id}.") else concept_id,
                "raw_concept_id": concept_id.split(".")[-1],
                "text": q_text,
                "options": options,
                "correct_answer": correct_ans,
                "explanation": explanation or f"Key concept verified in {concept_id}.",
                "difficulty": round(min(max(difficulty, 1.0), 7.0), 1)
            })

        return questions

    def parse_pdf(self, file_content: bytes, subject_id: str, overrides: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Parses a PDF file containing questions."""
        import io
        if not pypdf:
            raise ImportError("pypdf is required to parse PDF question banks")

        reader = pypdf.PdfReader(io.BytesIO(file_content))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"

        return self._extract_questions_from_text(full_text, subject_id, overrides)

    def parse_docx(self, file_content: bytes, subject_id: str, overrides: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Parses a DOCX file containing questions."""
        import io
        if not docx:
            raise ImportError("python-docx is required to parse DOCX question banks")

        doc = docx.Document(io.BytesIO(file_content))
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        return self._extract_questions_from_text(full_text, subject_id, overrides)

    def _extract_questions_from_text(self, text: str, subject_id: str, overrides: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Extracts structured questions from unstructured text using regex patterns and answer keys."""
        concepts = self.get_subject_concepts(subject_id)
        overrides = overrides or {}
        questions = []

        # Check if an Answer Key / Solutions section is present at the end of the text
        answer_key_map = {}
        key_section_match = re.search(r'(?:Answer Key|Solutions?|Answers Key)(.*)', text, re.IGNORECASE | re.DOTALL)
        if key_section_match:
            key_text = key_section_match.group(1)
            # Matches: 1. D — Turing Machine or 1. A or 1) C: Explanation
            key_matches = re.findall(r'(\d+)[\.\)]\s*\(?([A-Da-d])\)?(?:\s*[\—\-–\:]\s*([^\n\r]+))?', key_text)
            for q_num_str, ans_letter, exp in key_matches:
                try:
                    q_num = int(q_num_str)
                    answer_key_map[q_num] = {
                        "letter": ans_letter.upper(),
                        "explanation": exp.strip() if exp else f"Option {ans_letter.upper()} verified by diagnostic assessment answer key."
                    }
                except ValueError:
                    pass

        # Split main question text (ignoring the Answer Key section from question parsing)
        main_text = text[:key_section_match.start()] if key_section_match else text

        # Split text into blocks by Question N: or Q1., or 1. [A-Z], etc.
        blocks = re.split(r'\n(?=(?:Q(?:uestion)?\s*\d+[\.\:]|\d+[\.\:]\s+[A-Z]))', main_text, flags=re.IGNORECASE)

        for idx, block in enumerate(blocks):
            lines = [l.strip() for l in block.split("\n") if l.strip()]
            if not lines:
                continue

            q_text = lines[0]
            # Strip question number prefix like "1. ", "Question 1: "
            clean_q_text = re.sub(r'^(?:Q(?:uestion)?\s*\d+[\.\:]|\d+[\.\:]\s*)', '', q_text, flags=re.IGNORECASE).strip()
            if not clean_q_text:
                clean_q_text = q_text

            options = []
            answer = "0"
            explanation = ""

            for line in lines[1:]:
                # Matches A. ..., B) ..., etc.
                opt_match = re.match(r'^(?:[A-Da-d]|\d+)[\.\)]\s*(.*)', line)
                if opt_match:
                    options.append(opt_match.group(1).strip())
                elif re.match(r'^(?:Answer|Correct Answer|Ans)\s*[:\-]\s*(.*)', line, re.IGNORECASE):
                    ans_text = re.sub(r'^(?:Answer|Correct Answer|Ans)\s*[:\-]\s*', '', line, flags=re.IGNORECASE).strip()
                    answer = ans_text
                elif re.match(r'^(?:Explanation|Exp)\s*[:\-]\s*(.*)', line, re.IGNORECASE):
                    explanation = re.sub(r'^(?:Explanation|Exp)\s*[:\-]\s*', '', line, flags=re.IGNORECASE).strip()

            if not options:
                continue

            q_num = len(questions) + 1
            if q_num in answer_key_map:
                key_info = answer_key_map[q_num]
                letter = key_info["letter"]
                letter_idx = ord(letter) - ord('A')
                if 0 <= letter_idx < len(options):
                    answer = options[letter_idx]
                else:
                    answer = letter
                explanation = key_info["explanation"]

            concept_candidate = overrides.get(str(idx)) or overrides.get(q_text) or overrides.get(clean_q_text)
            concept_id = self.map_concept(clean_q_text, concepts, concept_candidate)

            q_id = f"{subject_id}_q_{len(questions)+1}"
            questions.append({
                "id": q_id,
                "subject_id": subject_id,
                "concept_id": f"{subject_id}.{concept_id}" if not concept_id.startswith(f"{subject_id}.") else concept_id,
                "raw_concept_id": concept_id.split(".")[-1],
                "text": clean_q_text,
                "options": options,
                "correct_answer": answer,
                "explanation": explanation or f"Fundamental rule in {concept_id}.",
                "difficulty": 3.0
            })

        return questions

    def save_question_bank(self, subject_id: str, new_questions: List[Dict[str, Any]], merge: bool = True) -> str:
        """Saves parsed questions to backend/data/question_banks/<subject_id>.json."""
        os.makedirs(QUESTION_BANKS_DIR, exist_ok=True)
        out_file = os.path.join(QUESTION_BANKS_DIR, f"{subject_id}.json")

        existing = []
        if merge and os.path.exists(out_file):
            try:
                with open(out_file, "r") as f:
                    existing = json.load(f)
            except Exception:
                existing = []

        existing_texts = {q["text"].strip().lower() for q in existing}
        combined = list(existing)
        for q in new_questions:
            if q["text"].strip().lower() not in existing_texts:
                combined.append(q)
                existing_texts.add(q["text"].strip().lower())

        with open(out_file, "w") as f:
            json.dump(combined, f, indent=2)

        return out_file
