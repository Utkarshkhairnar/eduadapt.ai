from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_cycle():
    print("Testing /health...")
    resp = client.get("/health")
    assert resp.status_code == 200, resp.text
    print("-> Health OK:", resp.json())

    print("\n1. Testing POST /assessment/start...")
    resp = client.post("/assessment/start", json={"student_id": "demo-student-1", "student_name": "Alex Rivera"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    attempt_id = data["attempt_id"]
    questions = data["questions"]
    print(f"-> Diagnostic started: attempt_id={attempt_id}, num_questions={len(questions)}")
    assert len(questions) == 12

    print("\n2. Testing POST /assessment/submit...")
    # Answer first 3 questions correctly, answer remaining incorrectly to simulate gap
    answers = []
    for i, q in enumerate(questions):
        answers.append({
            "question_id": q["id"],
            "concept_id": q["concept_id"],
            "selected_option": 1 if i < 3 else 0, # Simulated answers
            "response_time_seconds": 6.0
        })
    resp = client.post("/assessment/submit", json={
        "attempt_id": attempt_id,
        "student_id": "demo-student-1",
        "answers": answers
    })
    assert resp.status_code == 200, resp.text
    submit_data = resp.json()
    print(f"-> Submitted: score={submit_data['score']}%, correct={submit_data['correct_count']}")

    print("\n3. Testing GET /gaps/demo-student-1...")
    resp = client.get("/gaps/demo-student-1")
    assert resp.status_code == 200, resp.text
    gaps_data = resp.json()
    print(f"-> Gaps detected: total_concepts={gaps_data['total_concepts']}, gaps_count={gaps_data['gap_count']}")
    if gaps_data["root_bottleneck_concept"]:
        print(f"-> Root bottleneck: {gaps_data['root_bottleneck_concept']['concept_name']} ({gaps_data['root_bottleneck_concept']['concept_id']})")

    print("\n4. Testing GET /learning-path/demo-student-1...")
    resp = client.get("/learning-path/demo-student-1")
    assert resp.status_code == 200, resp.text
    path_data = resp.json()
    print(f"-> Learning path generated: curriculum steps={len(path_data['curriculum'])}")
    print(f"-> GenAI targeted concept: {path_data['genai_content']['concept_name']}")
    print(f"-> GenAI analogy preview: {path_data['genai_content']['mental_model_analogy'][:80]}...")

    print("\n5. Testing POST /quiz/next-question...")
    resp = client.post("/quiz/next-question", json={"student_id": "demo-student-1"})
    assert resp.status_code == 200, resp.text
    quiz_q = resp.json()
    print(f"-> Next adaptive question: {quiz_q['question']['id']} (Difficulty: {quiz_q['current_difficulty']})")

    print("\n6. Testing POST /quiz/submit-answer...")
    q_id = quiz_q["question"]["id"]
    c_id = quiz_q["target_concept_id"]
    resp = client.post("/quiz/submit-answer", json={
        "student_id": "demo-student-1",
        "question_id": q_id,
        "concept_id": c_id,
        "selected_option": 0,
        "difficulty": quiz_q["current_difficulty"]
    })
    assert resp.status_code == 200, resp.text
    ans_res = resp.json()
    print(f"-> Answer processed: is_correct={ans_res['is_correct']}, streak={ans_res['streak']}")
    print(f"-> BKT update: prior={ans_res['bkt_update']['prior_mastery']} -> new={ans_res['bkt_update']['new_mastery']} (delta: {ans_res['bkt_update']['delta']})")
    print(f"-> Adaptive difficulty: {ans_res['previous_difficulty']} -> {ans_res['new_difficulty']} ({ans_res['difficulty_adjustment_reason']})")

    print("\n7. Testing GET /profile/demo-student-1...")
    resp = client.get("/profile/demo-student-1")
    assert resp.status_code == 200, resp.text
    prof = resp.json()
    print(f"-> Student profile: name={prof['name']}, avg_mastery={prof['overall_mastery_average']}, mastered={prof['mastered_concepts_count']}/{prof['total_concepts_count']}")
    print(f"-> First delta: {prof['mastery_deltas'][0]['concept_name']} (baseline: {prof['mastery_deltas'][0]['baseline_mastery']} -> curr: {prof['mastery_deltas'][0]['current_mastery']})")

    print("\nALL 7 ENDPOINTS IN THE ADAPTIVE CYCLE PASSED VERIFICATION!")

if __name__ == "__main__":
    test_api_cycle()
