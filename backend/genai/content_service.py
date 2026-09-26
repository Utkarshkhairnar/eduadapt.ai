"""
backend/genai/content_service.py
──────────────────────────────────────────────────────────────
Real AI API integration supporting OpenAI and Google Gemini.
Provider, model and keys loaded from backend/configs/.env via
backend/core/config.py (Pydantic Settings).

Graceful fallback: if the API call fails or times out, every
method returns a templated string / dict so the demo never crashes.
"""
import json
import os
import re
import yaml
import httpx
import asyncio
import datetime
from typing import Any, Dict, List, Optional

from backend.core.config import get_ai_settings

# ── Load YAML config ──────────────────────────────────────────
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "configs", "default.yaml")


def _load_yaml_cfg() -> Dict[str, Any]:
    try:
        with open(_CONFIG_PATH) as f:
            return yaml.safe_load(f) or {}
    except Exception:
        return {}


_YAML_CFG = _load_yaml_cfg()
_DYN_CFG = _YAML_CFG.get("dynamic_questions", {})
_REPORT_CFG = _YAML_CFG.get("reports", {})
_DYNAMIC_ENABLED = _DYN_CFG.get("enabled", True)
_EXCLUDE_LAST_N = int(_DYN_CFG.get("exclude_last_n", 5))
_MAX_REGEN = int(_DYN_CFG.get("max_regeneration_attempts", 2))


# ── Provider-agnostic LLM caller ─────────────────────────────
class _LLMCaller:
    """
    Single call wrapper. Picks OpenAI or Gemini based on AI_PROVIDER setting.
    Falls back to mock if key missing/invalid/timeout.
    """

    @property
    def settings(self):
        return get_ai_settings()

    @property
    def provider(self) -> str:
        s = self.settings
        p = s.ai_provider.lower()
        # Auto-detect: if key present, use that provider
        if p == "auto" or p == "mock_fallback":
            if s.gemini_api_key:
                return "gemini"
            if s.openai_api_key:
                return "openai"
            return "mock_fallback"
        return p

    @property
    def model(self) -> str:
        return self.settings.ai_model or "gemini-1.5-flash"

    @property
    def timeout(self) -> int:
        return self.settings.ai_timeout_seconds or 20

    async def call(self, prompt: str, system: str = "", json_mode: bool = False) -> str:
        """
        Call the configured provider and return the raw text response.
        Falls back to '' on any error (caller handles fallback).
        """
        p = self.provider
        try:
            if p == "gemini":
                return await self._call_gemini(prompt, system, json_mode)
            elif p == "openai":
                return await self._call_openai(prompt, system, json_mode)
            else:
                return ""  # mock_fallback → caller uses template
        except Exception:
            return ""

    async def _call_gemini(self, prompt: str, system: str, json_mode: bool = False) -> str:
        key = self.settings.gemini_api_key
        if not key:
            return ""
        model = self.model if "gemini" in self.model else "gemini-2.5-flash"
        full_prompt = f"{system}\n\n{prompt}".strip() if system else prompt
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={key}"
        )
        gen_config: Dict[str, Any] = {"temperature": 0.7, "maxOutputTokens": 1024}
        if json_mode:
            gen_config["responseMimeType"] = "application/json"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": gen_config,
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )

    async def _call_openai(self, prompt: str, system: str, json_mode: bool) -> str:
        key = self.settings.openai_api_key
        if not key:
            return ""
        model = self.model if "gpt" in self.model else "gpt-4o-mini"
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json=payload,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    async def health_check(self) -> Dict[str, Any]:
        """
        Lightweight test call to verify the key is working.
        Returns {"provider", "model", "status", "latency_ms", "error"}.
        """
        p = self.provider
        if p == "mock_fallback":
            return {"provider": "mock_fallback", "model": "none", "status": "degraded",
                    "latency_ms": 0, "error": "No API key configured. Using mock fallback."}
        start = asyncio.get_event_loop().time()
        try:
            result = await self.call("Reply with exactly: OK", system="You are a test bot.")
            ms = int((asyncio.get_event_loop().time() - start) * 1000)
            ok = bool(result and len(result.strip()) > 0)
            return {
                "provider": p, "model": self.model,
                "status": "ok" if ok else "error",
                "latency_ms": ms,
                "error": None if ok else "Empty response from provider"
            }
        except Exception as e:
            ms = int((asyncio.get_event_loop().time() - start) * 1000)
            return {"provider": p, "model": self.model, "status": "error",
                    "latency_ms": ms, "error": str(e)}


_caller = _LLMCaller()


# ─────────────────────────────────────────────────────────────
#  MAIN SERVICE CLASS
# ─────────────────────────────────────────────────────────────
class GenAIContentService:
    """
    Public AI service. Every method has a graceful fallback so
    a missing/invalid key degrades gracefully instead of crashing.
    """

    # ── Pedagogical knowledge base (used as fallback content) ──
    KNOWLEDGE_BASE = {
        "C01": {
            "analogy": "Think of variables not as boxes holding values, but as sticky luggage tags tied to objects floating in memory.",
            "explanation": "In Python, variables are reference pointers to heap-allocated objects. Immutable types cannot have their internal state altered; reassigning binds the variable to a new object. Mutable objects can be modified in-place.",
            "worked_example": {
                "code": "a = [1, 2, 3]\nb = a\nb.append(4)\nprint(a)  # [1, 2, 3, 4] — aliased!",
                "walkthrough": ["'b = a' copies the reference, not the object.", "Mutating 'b' alters the shared list."],
            },
            "common_pitfalls": ["Assuming 'b = a' creates an independent copy.", "Using mutable default arguments."],
            "practice_challenge": {"prompt": "Deep copy a 2D matrix without aliasing."},
        },
    }

    # ── Preference helper ─────────────────────────────────────
    @staticmethod
    def _format_pref_instruction(pref: Optional[Dict[str, Any]]) -> str:
        if not pref:
            return ""
        style = pref.get("explanation_style", "Simple, step-by-step")
        domain = pref.get("analogy_domain", "Everyday life")
        pace = pref.get("pace", "Thorough / detailed")
        domain_clause = f", using analogies from {domain}" if domain and domain != "No preference" else ""
        return f" The student prefers {style} explanations{domain_clause}. Keep it {pace}."

    # ── 1. Explanation ────────────────────────────────────────
    async def generate_explanation(
        self,
        concept_name: str,
        student_context: str = "",
        learning_preference: Optional[Dict[str, Any]] = None
    ) -> str:
        pref_str = self._format_pref_instruction(learning_preference)
        prompt = (
            f"Write a clear, student-friendly explanation of '{concept_name}'{pref_str}. "
            f"Context: {student_context}. "
            "Use a real-world analogy. Keep it under 140 words. Plain language, no jargon."
        )
        result = await _caller.call(prompt)
        return result.strip() or (
            f"{concept_name} is a foundational concept. "
            "Understanding it requires building up from its prerequisites step by step."
        )

    # ── 2. Worked example ────────────────────────────────────
    async def generate_worked_example(
        self,
        concept_name: str,
        difficulty: float,
        learning_preference: Optional[Dict[str, Any]] = None
    ) -> str:
        pref_str = self._format_pref_instruction(learning_preference)
        prompt = (
            f"Provide a worked code/numerical example for '{concept_name}' at difficulty level {difficulty:.0f}/7{pref_str}. "
            "Include: (a) the code or problem snippet, (b) a 3-step walkthrough. "
            "Format as plain text. Under 200 words."
        )
        result = await _caller.call(prompt)
        return result.strip() or f"# Worked example for {concept_name}\n# Step 1: Initialize base case.\n# Step 2: Apply transformation.\n# Step 3: Verify output."

    # ── Targeted Help for contextual doubts (Section 2) ───────
    async def generate_targeted_help(
        self,
        concept_name: str,
        question_text: str,
        student_mastery: float = 0.5,
        learning_preference: Optional[Dict[str, Any]] = None,
        previous_context: Optional[str] = None
    ) -> str:
        """
        Generates tailored assistance addressing the student's exact doubt.
        """
        pref_str = self._format_pref_instruction(learning_preference)
        ctx = f"\nPrevious exchange for context:\n{previous_context}\n" if previous_context else ""
        prompt = (
            f"A student studying '{concept_name}' (current concept mastery: {student_mastery:.0%}) asks a specific question:\n"
            f"\"{question_text}\"\n"
            f"{ctx}"
            f"Provide a targeted, reassuring response that directly resolves this exact doubt{pref_str}. "
            "Do NOT give a generic re-explanation of the entire concept. Address only what they asked. "
            "Under 160 words. Warm, direct, and actionable."
        )
        result = await _caller.call(prompt)
        if result and len(result.strip()) > 15:
            return result.strip()
        return (
            f"Great question about {concept_name}. "
            f"Regarding \"{question_text[:50]}\": focus on the prerequisite relationship. "
            "Try tracing the step with a small test input to see how the logic unfolds."
        )

    # ── Alternative Explanation for 'Explain differently' (Section 3) ──
    async def generate_alternative_explanation(
        self,
        concept_name: str,
        previous_content: str,
        learning_preference: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Regenerates an explanation with a noticeably different approach / analogy.
        """
        pref_str = self._format_pref_instruction(learning_preference)
        prev_snip = previous_content[:200] if previous_content else ""
        prompt = (
            f"The student did not find this previous explanation of '{concept_name}' clear:\n"
            f"\"{prev_snip}\"\n\n"
            f"The student did not find the previous explanation clear. Try a noticeably different approach or analogy this time{pref_str}. "
            "Focus on high intuition, simplicity, and a fresh perspective. Under 140 words."
        )
        result = await _caller.call(prompt)
        if result and len(result.strip()) > 15:
            return result.strip()
        return (
            f"Here is another way to think about {concept_name}: "
            f"Imagine it as an assembly line where each step must complete before the next station can run. "
            "Once the input structure is set, the transition becomes predictable."
        )

    # ── 3. Dynamic Practice Question (Tier 2) ─────────────────
    async def generate_practice_question(
        self,
        concept_id: str,
        concept_name: str,
        difficulty: float,
        exclude_questions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generates a NEW practice question via LLM.
        Validates: correct_answer must be one of options[].
        Retries once if malformed. Falls back to template if both fail.
        """
        exclude_str = ""
        if exclude_questions:
            recent = exclude_questions[-_EXCLUDE_LAST_N:]
            exclude_str = (
                "\n\nDo NOT repeat or closely rephrase any of these previous questions:\n"
                + "\n".join(f"- {q}" for q in recent)
            )

        system = (
            "You are an expert educator. Respond ONLY with valid JSON — no markdown, no extra text. "
            "The JSON must have exactly these keys: "
            '{"question_text": str, "options": [str,str,str,str], '
            '"correct_answer": str, "explanation": str, "difficulty": int}'
        )
        prompt = (
            f"Generate ONE multiple-choice question testing the concept: '{concept_name}' (ID: {concept_id}). "
            f"Difficulty level: {int(round(difficulty))}/7 (1=easiest, 7=hardest). "
            "Provide 4 options. correct_answer must be the exact text of the correct option."
            + exclude_str
        )

        for attempt in range(_MAX_REGEN + 1):
            raw = await _caller.call(prompt, system=system, json_mode=True)
            validated = self._validate_question_json(raw, concept_id, concept_name, difficulty)
            if validated:
                validated["source"] = "generated"
                return validated

        # Fallback template
        return self._fallback_question(concept_id, concept_name, difficulty)

    def _validate_question_json(
        self, raw: str, concept_id: str, concept_name: str, difficulty: float
    ) -> Optional[Dict[str, Any]]:
        """Parse and validate LLM question JSON. Returns None if invalid."""
        if not raw:
            return None
        try:
            # Strip markdown fences if present
            text = re.sub(r"```[a-z]*\n?", "", raw).strip()
            data = json.loads(text)
            q_text = str(data.get("question_text", "")).strip()
            options = data.get("options", [])
            correct = str(data.get("correct_answer", "")).strip()
            explanation = str(data.get("explanation", "")).strip()
            diff = int(data.get("difficulty", round(difficulty)))

            if not q_text or len(options) < 2 or not correct:
                return None
            # correct_answer must be one of options
            if correct not in options:
                # Try case-insensitive match
                lower_opts = [o.lower() for o in options]
                if correct.lower() not in lower_opts:
                    return None
                correct = options[lower_opts.index(correct.lower())]

            return {
                "id": f"gen_{concept_id}_{abs(hash(q_text)) % 100000:05d}",
                "concept_id": concept_id,
                "concept_name": concept_name,
                "text": q_text,
                "options": list(options),
                "correct_answer": correct,
                "explanation": explanation or f"The correct answer is: {correct}",
                "difficulty": diff,
            }
        except (json.JSONDecodeError, TypeError, ValueError):
            return None

    def _fallback_question(
        self, concept_id: str, concept_name: str, difficulty: float
    ) -> Dict[str, Any]:
        """Template question when LLM fails."""
        import hashlib, datetime
        seed = hashlib.md5(f"{concept_id}{datetime.datetime.utcnow().isoformat()[:13]}".encode()).hexdigest()[:6]
        return {
            "id": f"fallback_{concept_id}_{seed}",
            "concept_id": concept_id,
            "concept_name": concept_name,
            "text": f"Which of the following best describes {concept_name}?",
            "options": [
                f"The core principle of {concept_name}",
                f"An unrelated concept from a different domain",
                f"A common misconception about {concept_name}",
                f"The inverse operation of {concept_name}",
            ],
            "correct_answer": f"The core principle of {concept_name}",
            "explanation": f"This question tests understanding of {concept_name}.",
            "difficulty": int(round(difficulty)),
            "source": "fallback",
        }

    # ── 4. Attempt summary (Feature 3) ───────────────────────
    async def generate_attempt_summary(self, report_data: Dict[str, Any]) -> str:
        """
        Generates a 2-3 sentence plain-language summary of an attempt.
        Written directly to the student.
        """
        score = report_data.get("score_pct", 0)
        subject = report_data.get("subject_name", "this subject")
        root_gap = report_data.get("root_gap_name", None)
        well = report_data.get("well_concepts", [])
        weak = report_data.get("weak_concepts", [])

        prompt = (
            f"You are writing a brief, encouraging progress note directly to a student. "
            f"They just completed a {subject} assessment and scored {score:.0f}%. "
        )
        if well:
            prompt += f"They answered correctly on: {', '.join(well[:3])}. "
        if weak:
            prompt += f"They struggled with: {', '.join(weak[:3])}. "
        if root_gap:
            prompt += f"The root prerequisite gap identified is: {root_gap}. "
        prompt += (
            "Write 2-3 sentences: what went well, what the real weak spot is, and what to study next. "
            "Be direct, warm, and specific. Address the student as 'you'. No jargon."
        )

        result = await _caller.call(prompt)
        if result and len(result.strip()) > 20:
            return result.strip()

        # Fallback
        if root_gap:
            return (
                f"You scored {score:.0f}% on this {subject} assessment — "
                f"{'great work' if score >= 70 else 'a solid start'}. "
                f"The key area to focus on is {root_gap}, "
                f"which is blocking several downstream concepts. "
                f"Work through the learning path for {root_gap} first, then revisit this assessment."
            )
        return (
            f"You scored {score:.0f}% on {subject}. "
            f"{'Most concepts are solid — keep practising the weaker areas.' if score >= 70 else 'Keep going — targeted practice on the identified gaps will improve your score quickly.'}"
        )

    # ── Full lesson (used by learning path, unchanged API) ────
    async def generate_lesson_for_gap(
        self,
        concept_id: str,
        concept_name: str,
        concept_metadata: Dict[str, Any] = None,
        student_mastery: float = 0.25,
        learning_preference: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        meta = concept_metadata or {}
        raw_id = concept_id.split(".")[-1] if "." in concept_id else concept_id
        kb = self.KNOWLEDGE_BASE.get(raw_id, {})

        # Try live generation with student preference
        analogy = await self.generate_explanation(
            concept_name,
            f"student mastery {student_mastery:.0%}",
            learning_preference=learning_preference
        )
        example = await self.generate_worked_example(
            concept_name,
            meta.get("difficulty_base", 3),
            learning_preference=learning_preference
        )
        practice_q = await self.generate_practice_question(concept_id, concept_name, meta.get("difficulty_base", 3))

        fallback_analogy = kb.get("analogy", f"Think of {concept_name} as a building block — master it to unlock more advanced topics.")
        fallback_example = kb.get("worked_example", {"code": f"# {concept_name} example", "walkthrough": ["Step 1: Understand the base case.", "Step 2: Build upward."]})

        return {
            "concept_id": concept_id,
            "concept_name": concept_name,
            "analogy": analogy or fallback_analogy,
            "explanation": analogy or kb.get("explanation", f"{concept_name} is a key concept that must be mastered before progressing."),
            "worked_example": {
                "code": example or fallback_example.get("code", ""),
                "walkthrough": fallback_example.get("walkthrough", []),
                "expected_output": fallback_example.get("expected_output", ""),
            },
            "common_pitfalls": kb.get("common_pitfalls", [f"Rushing past {concept_name} without solid practice.", "Not testing edge cases."]),
            "practice_challenge": {"prompt": practice_q.get("text", kb.get("practice_challenge", {}).get("prompt", f"Practice {concept_name} with a real example."))},
            "mental_model_analogy": analogy or fallback_analogy,
            "generated_question": practice_q,
        }

    # ── AI status health check (Feature 4) ───────────────────
    @staticmethod
    async def ai_health_check() -> Dict[str, Any]:
        return await _caller.health_check()
