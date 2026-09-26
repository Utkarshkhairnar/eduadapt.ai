# EduAdapt AI — Multi-Subject Adaptive AI-Powered Learning Platform

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev)
[![NetworkX](https://img.shields.io/badge/NetworkX-DAG_Graphs-orange.svg)](https://networkx.org)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An end-to-end, full-stack **Multi-Subject Adaptive Learning Platform** that executes continuous closed-loop learning cycles across **six distinct STEM subjects**, powered by **Bayesian Knowledge Tracing (BKT)**, **NetworkX Directed Acyclic Graphs (DAG)**, **GenAI pedagogical scaffolding**, and a dual-role interface (**Student App** & **Teacher / Admin App**).

$$\text{Diagnostic Assessment} \longrightarrow \text{Answer Reveal} \longrightarrow \text{Prerequisite Gap Map} \longrightarrow \text{Learning Path} \longrightarrow \text{Adaptive Quiz} \longrightarrow \text{Longitudinal Snapshots}$$

---

## 📚 1. Six Supported Subjects

The platform independently tracks, calibrates, and models prerequisite knowledge graphs for exactly these 6 subjects:

1. **Maths 3** (`subject_id: maths3`): Calculus, Linear Algebra, Fourier Series, and Complex Analysis
2. **Automata Theory** (`subject_id: automata_theory`): Finite Automata, Regular Expressions, Context-Free Grammars, Turing Machines
3. **ADSA** (`subject_id: adsa`): Advanced Data Structures, Graph Algorithms, Greedy, Dynamic Programming, Complexity
4. **Java** (`subject_id: java`): OOP, Inheritance, Polymorphism, Collections Framework, Multithreading, JVM
5. **C** (`subject_id: c_programming`): Pointers, Memory Allocation, Structures, Preprocessor, System Calls
6. **Python** (`subject_id: python`): Control Flow, Scopes, Dynamic Structures, Recursion, Algorithmic Thinking

- **Subjects Registry**: Loaded at startup from [`backend/data/concept_graphs/subjects_registry.yaml`](backend/data/concept_graphs/subjects_registry.yaml).
- **Internal Namespacing**: Every concept is namespaced as `<subject_id>.<concept_id>` (e.g. `maths3.M01`, `python.P04`), preventing any cross-subject collisions in masteries, quiz states, or gap records.

---

## 🔄 2. Assessment + Answer Reveal Pipeline

1. **`POST /admin/question-bank/upload`**
   - Ingests CSV, PDF, or DOCX assessment files per subject.
   - Extracts questions and auto-maps each to a `concept_id` in the subject's concept graph using keyword matching (with manual overrides supported).
   - Stores persistently in `backend/data/question_banks/<subject_id>.json` and SQLite `questions` table.

2. **`POST /assessment/start`** `{student_id, subject_id}`
   - Assembles a diagnostic test by sampling questions breadth-first from root concepts, difficulty-weighted toward the `difficulty_base` of each concept.

3. **`POST /assessment/submit`** `{student_id, subject_id, answers[]}`
   - Scores answers against the question bank.
   - Returns a **REVEAL payload** per question: student's answer, correct answer, correct/incorrect badge, and pedagogical explanation.
   - Immediately executes the **5-step recompute cascade**:
     1. `knowledge_tracer.update_mastery(student_id, subject_id, results)`
     2. `gap_analyzer.recompute(student_id, subject_id)`
     3. `path_generator.regenerate(student_id, subject_id)`
     4. `quiz_engine.recalibrate_difficulty(student_id, subject_id)`
     5. `profile_store.snapshot(student_id, subject_id)` *(append-only in `MasterySnapshot` table)*.

4. **`GET /gaps/{student_id}/{subject_id}`**
   - Walks backward from any concept below `mastery_threshold` (0.70) to identify the **earliest unmastered prerequisite** — the true root bottleneck gating downstream learning.

5. **`GET /learning-path/{student_id}/{subject_id}`**
   - Ordered topological sequence (prerequisite-first) + GenAI mental model analogy, conceptual foundations, worked code walkthrough, common pitfalls, and active practice challenge.

6. **`POST /quiz/next-question`** `{student_id, subject_id}`
   - Adapts difficulty using the bounded step rule clamped to `[1, 7]`:
     $$\text{next\_difficulty} = \text{clamp}\big(\text{current\_difficulty} + \text{step} \cdot (+1 \text{ if correct else } -1), \; 1.0, \; 7.0\big)$$
   - Biases question selection toward the student's current weakest concept in that subject.

7. **`POST /quiz/submit-answer`**
   - Executes the recompute cascade scoped to that concept and appends a `MasterySnapshot`.

8. **`GET /profile/{student_id}/history?subject_id=`**
   - With `subject_id`: returns snapshot list for mastery-over-time charts.
   - Without `subject_id`: aggregates current mastery across all 6 subjects into one dashboard view.

9. **`POST /admin/drive-import` & `POST /admin/drive-import/confirm`** *(Google Drive Pipeline Extension)*
   - Scans shared Google Drive folders (`https://drive.google.com/drive/folders/1hGhtwrpMxWxtwi4NAnkreCz-_B5dy_Eo`) using Google Drive API v3.
   - Recursively enumerates files, detects subjects, extracts questions from PDF, DOCX, CSV, Google Docs/Sheets.
   - Returns an interactive preview with mapped concepts, confidence scores, and inline correction capability.
   - Merges confirmed items directly into the live question banks and SQLite database.

---


## 👥 3. Two Role-Based Interfaces

The user model includes a `role` field (`student` | `teacher`). Route guards enforce that students can only ever query their own `student_id`, while teachers can query any student in their class.

### Student App (`/student/*`)
- **SubjectSelect**: Pick from any of the 6 subjects with mastery progress indicators.
- **DiagnosticTest**: Breadth-first diagnostic assessment with progress tracking.
- **AnswerReveal**: Item-by-item review with correct answers, explanations, and 5-step cascade inspection.
- **GapMap**: Interactive prerequisite graph highlighting the primary root bottleneck and downstream blocked nodes.
- **LearningPath**: Clean 3-column prerequisite-first topological curriculum + GenAI pedagogy.
- **AdaptiveQuiz**: Real-time adaptive quiz adjusting difficulty on $[1, 7]$ scale with live BKT Bayes updates.
- **MyProgress**: Multi-subject mastery summary and longitudinal snapshot curve.

### Teacher / Admin App (`/teacher/*`)
- **ClassRoster**: Cohort list (`CS-2026`) with diagnostic completion, average mastery, and streak.
- **StudentDrillDown**: In-depth view of a student's 6-subject mastery, gap maps, and raw attempt logs.
- **ClassHeatmap**: Interactive subject x concept matrix color-coded by student mastery (Green $\ge 70\%$, Amber $45-70\%$, Red $< 45\%$).
- **CommonGapsReport**: Ranked concepts with the highest % of students weak, highlighting critical prerequisite bottlenecks.
- **QuestionBankUpload**: Upload CSV, PDF, or Word DOCX question banks with automated concept graph mapping.

---

## 📂 4. Project Structure

```text
EduAdapt AI/
├── backend/
│   ├── api/
│   │   ├── student_endpoints.py   # /assessment, /gaps, /learning-path, /quiz, /profile
│   │   ├── teacher_endpoints.py   # /teacher/class/..., /teacher/student/...
│   │   ├── admin_endpoints.py     # /admin/question-bank/upload, /admin/subjects
│   │   ├── endpoints.py           # Legacy endpoint compatibility layer
│   │   └── schemas.py             # Pydantic request & response models
│   ├── auth/
│   │   └── roles.py               # Role-based route guards (student vs teacher)
│   ├── core/
│   │   ├── knowledge_tracer.py    # Bayesian Knowledge Tracing (Corbett & Anderson)
│   │   ├── gap_analyzer.py        # 6-subject NetworkX DAG traversal & root bottleneck detection
│   │   ├── path_generator.py      # Multi-subject topological curriculum builder
│   │   └── quiz_engine.py         # Adaptive difficulty rule [1, 7] & weakest concept biasing
│   ├── data/
│   │   ├── concept_graphs/
│   │   │   ├── subjects_registry.yaml # 6 subjects registry
│   │   │   ├── maths3.yaml
│   │   │   ├── automata_theory.yaml
│   │   │   ├── adsa.yaml
│   │   │   ├── java.yaml
│   │   │   ├── c_programming.yaml
│   │   │   └── python.yaml
│   │   └── question_banks/        # Ingested JSON question banks per subject
│   ├── db/
│   │   ├── models.py              # User, Subject, Concept, Question, Attempt, MasterySnapshot
│   │   └── session.py             # SQLAlchemy SQLite engine & session factory
│   ├── genai/
│   │   └── content_service.py     # GenAI lessons, worked code examples, and explanation generator
│   ├── ingestion/
│   │   └── question_bank_parser.py # CSV (pandas), PDF (pypdf), DOCX parser & concept mapper
│   ├── configs/default.yaml       # Platform parameters & thresholds
│   ├── main.py                    # FastAPI server entry point
│   └── test_full_suite.py         # Automated 8-phase integration test suite
├── frontend/
│   ├── src/
│   │   ├── student-app/           # SubjectSelect, DiagnosticTest, AnswerReveal, GapMap, LearningPath, AdaptiveQuiz, MyProgress
│   │   ├── teacher-app/           # ClassRoster, StudentDrillDown, ClassHeatmap, CommonGapsReport, QuestionBankUpload
│   │   ├── App.jsx                # Role-based root shell (Student View & Teacher View)
│   │   └── index.css              # Dark glassmorphic design system fitted strictly to 100vh
│   └── vite.config.js             # Vite proxy configuration
├── scripts/
│   ├── seed_demo_data.py          # Seeds 1 teacher, 6 students, attempts, and snapshots
│   └── create_initial_question_banks.py # Calibrated baseline questions
└── README.md
```

---

## ⚡ 5. Quick Start Guide

### 1. Backend Setup & Run

```bash
# Activate Python virtual environment
source venv/bin/activate

# Seed demo data (1 teacher, 6 students, historical snapshots across all 6 subjects)
python3 scripts/seed_demo_data.py

# Start FastAPI server on port 8000
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Backend will be live at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

### 2. Frontend Setup & Run

```bash
cd frontend
pnpm run dev --host 0.0.0.0 --port 3000
```
Frontend will be live at `http://localhost:3000`.

---

## 🧪 6. Automated Verification

Run the full end-to-end integration test suite verifying all 6 subjects, role authorization, diagnostic assessment, answer reveal, adaptive difficulty recalibration, and CSV file upload:

```bash
python3 backend/test_full_suite.py
```

Expected output:
```text
Testing 1: Health & Subjects Registry...
  ✓ Health OK with 6 subjects
  ✓ Subjects verified: {'maths3', 'automata_theory', 'adsa', 'java', 'c_programming', 'python'}

Testing 2: Teacher Endpoints...
  ✓ Class roster OK (6 students)
  ✓ Heatmap matrix OK for ADSA (6 x 7)
  ✓ Common gaps OK (7 concepts ranked descending)
  ✓ Student drill-down OK (6 subjects summarized, 49 raw attempts)

Testing 3: Student Diagnostic Assessment & Reveal Pipeline...
  ✓ Diagnostic started for maths3 (7 questions assembled)
  ✓ Diagnostic submitted with Answer Reveal (7 items) and 5-step cascade

Testing 4: Knowledge Gap & Prerequisite Traversal...
  ✓ Gap map retrieved for maths3 (7 graph nodes, root bottleneck: Linear Equations & Matrices)

Testing 5: Learning Path & GenAI Content...
  ✓ Learning path synthesized for maths3 (7 topological steps)

Testing 6: Adaptive Quiz Item Engine...
  ✓ Adaptive next question served: q_m01_1, difficulty: 2.0/7
  ✓ Adaptive answer scored, difficulty stepped to 1.0/7, BKT delta: -0.0021

Testing 7: Longitudinal Snapshots & Cross-Subject History...
  ✓ Cross-subject history OK (6 subjects aggregated, 141 snapshots)

Testing 8: Question Bank File Ingestion (CSV)...
  ✓ Question bank upload successful (2 questions ingested)

=======================================================
ALL 8 VERIFICATION PHASES PASSED WITH ZERO ERRORS!
=======================================================
```
