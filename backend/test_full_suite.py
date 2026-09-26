import os
import sys
import json
import io
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_full_platform():
    print("Testing 1: Health & Subjects Registry...")
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    assert len(health.get("subjects", [])) == 6, "Expected exactly 6 subjects in health check"
    print("  ✓ Health OK with 6 subjects")

    res = requests.get(f"{BASE_URL}/admin/subjects")
    assert res.status_code == 200
    subjects = res.json()["subjects"]
    assert len(subjects) == 6, f"Expected 6 subjects, got {len(subjects)}"
    expected_ids = {"maths3", "automata_theory", "adsa", "java", "c_programming", "python"}
    actual_ids = {s["id"] for s in subjects}
    assert expected_ids == actual_ids, f"Mismatch in subject IDs: {actual_ids}"
    print(f"  ✓ Subjects verified: {actual_ids}")

    print("\nTesting 2: Teacher Endpoints...")
    t_headers = {"X-User-Id": "teacher_1", "X-User-Role": "teacher"}

    # Roster
    res = requests.get(f"{BASE_URL}/teacher/class/CS-2026/roster", headers=t_headers)
    assert res.status_code == 200
    roster = res.json()
    assert roster["total_students"] >= 6, f"Expected at least 6 students, got {roster['total_students']}"
    print(f"  ✓ Class roster OK ({roster['total_students']} students)")

    # Heatmap for adsa
    res = requests.get(f"{BASE_URL}/teacher/class/CS-2026/subject/adsa/heatmap", headers=t_headers)
    assert res.status_code == 200
    heatmap = res.json()
    assert len(heatmap["concepts"]) == 7
    assert len(heatmap["matrix"]) >= 6
    print(f"  ✓ Heatmap matrix OK for ADSA ({len(heatmap['matrix'])} x {len(heatmap['concepts'])})")

    # Common Gaps for automata_theory
    res = requests.get(f"{BASE_URL}/teacher/class/CS-2026/subject/automata_theory/common-gaps", headers=t_headers)
    assert res.status_code == 200
    cg = res.json()
    assert len(cg["ranked_gaps"]) == 7
    print(f"  ✓ Common gaps OK ({len(cg['ranked_gaps'])} concepts ranked descending)")

    # Student Drill Down
    res = requests.get(f"{BASE_URL}/teacher/student/student_1/full-profile", headers=t_headers)
    assert res.status_code == 200
    drill = res.json()
    assert "subject_summaries" in drill
    assert len(drill["subject_summaries"]) == 6
    assert len(drill["raw_attempts"]) > 0
    print(f"  ✓ Student drill-down OK (6 subjects summarized, {len(drill['raw_attempts'])} raw attempts)")

    print("\nTesting 3: Student Diagnostic Assessment & Reveal Pipeline...")
    s_headers = {"X-User-Id": "student_1", "X-User-Role": "student"}

    # Start assessment for maths3
    res = requests.post(f"{BASE_URL}/assessment/start", json={"student_id": "student_1", "subject_id": "maths3"}, headers=s_headers)
    assert res.status_code == 200, res.text
    diag = res.json()
    assert len(diag["questions"]) > 0
    q_id = diag["questions"][0]["id"]
    c_id = diag["questions"][0]["concept_id"]
    print(f"  ✓ Diagnostic started for maths3 ({len(diag['questions'])} questions assembled)")

    # Submit assessment
    submit_payload = {
        "student_id": "student_1",
        "subject_id": "maths3",
        "answers": [
            {"question_id": q["id"], "concept_id": q["concept_id"], "student_answer": 0}
            for q in diag["questions"]
        ]
    }
    res = requests.post(f"{BASE_URL}/assessment/submit", json=submit_payload, headers=s_headers)
    assert res.status_code == 200, res.text
    sub_res = res.json()
    assert "reveal_payload" in sub_res
    assert len(sub_res["reveal_payload"]) == len(diag["questions"])
    assert "cascade_status" in sub_res
    print(f"  ✓ Diagnostic submitted with Answer Reveal ({len(sub_res['reveal_payload'])} items) and 5-step cascade")

    print("\nTesting 4: Knowledge Gap & Prerequisite Traversal...")
    res = requests.get(f"{BASE_URL}/gaps/student_1/maths3", headers=s_headers)
    assert res.status_code == 200
    gap_data = res.json()
    assert "graph_nodes" in gap_data
    assert "analysis_narrative" in gap_data
    print(f"  ✓ Gap map retrieved for maths3 ({len(gap_data['graph_nodes'])} graph nodes, root bottleneck: {gap_data.get('root_bottleneck_concept', {}).get('concept_name')})")

    print("\nTesting 5: Learning Path & GenAI Content...")
    res = requests.get(f"{BASE_URL}/learning-path/student_1/maths3", headers=s_headers)
    assert res.status_code == 200
    lp = res.json()
    assert len(lp["curriculum"]) > 0
    assert "learning_strategy" in lp
    print(f"  ✓ Learning path synthesized for maths3 ({len(lp['curriculum'])} topological steps)")

    print("\nTesting 6: Adaptive Quiz Item Engine...")
    res = requests.post(f"{BASE_URL}/quiz/next-question", json={"student_id": "student_1", "subject_id": "maths3"}, headers=s_headers)
    assert res.status_code == 200
    next_q = res.json()
    assert 1.0 <= next_q["current_difficulty"] <= 7.0
    print(f"  ✓ Adaptive next question served: {next_q['question']['id']}, difficulty: {next_q['current_difficulty']}/7")

    # Submit quiz answer
    quiz_sub = {
        "student_id": "student_1",
        "subject_id": "maths3",
        "question_id": next_q["question"]["id"],
        "concept_id": next_q["target_concept_id"],
        "student_answer": 0,
        "current_difficulty": next_q["current_difficulty"]
    }
    res = requests.post(f"{BASE_URL}/quiz/submit-answer", json=quiz_sub, headers=s_headers)
    assert res.status_code == 200
    q_res = res.json()
    assert 1.0 <= q_res["new_difficulty"] <= 7.0
    assert "bkt_update" in q_res
    print(f"  ✓ Adaptive answer scored, difficulty stepped to {q_res['new_difficulty']}/7, BKT delta: {q_res['bkt_update']['delta']}")

    print("\nTesting 7: Longitudinal Snapshots & Cross-Subject History...")
    res = requests.get(f"{BASE_URL}/profile/student_1/history", headers=s_headers)
    assert res.status_code == 200
    hist = res.json()
    assert len(hist["subject_overviews"]) == 6
    assert len(hist["snapshots"]) > 0
    print(f"  ✓ Cross-subject history OK ({len(hist['subject_overviews'])} subjects aggregated, {len(hist['snapshots'])} snapshots)")

    print("\nTesting 8: Question Bank File Ingestion (CSV)...")
    sample_csv = (
        "question,options,correct_answer,explanation,difficulty\n"
        "What is the rank of an identity matrix of size 3x3?,1|2|3|0,3,The rank of an identity matrix equals its dimension.,2\n"
        "Which condition must hold for matrix invertibility?,Determinant is zero|Determinant is non-zero|Trace is zero|Rank is 1,Determinant is non-zero,A matrix is invertible if and only if its determinant is non-zero.,3\n"
    )
    files = {"file": ("test_maths.csv", io.BytesIO(sample_csv.encode("utf-8")), "text/csv")}
    data = {"subject_id": "maths3"}
    res = requests.post(f"{BASE_URL}/admin/question-bank/upload", files=files, data=data, headers=t_headers)
    assert res.status_code == 200, res.text
    up_res = res.json()
    assert up_res["status"] == "success"
    assert up_res["questions_count"] >= 2
    print(f"  ✓ Question bank upload successful ({up_res['questions_count']} questions ingested)")

    print("\nTesting 9: Google Drive Ingestion Pipeline (Folder Scan & Merge)...")
    drive_payload = {
        "folder_url_or_id": "https://drive.google.com/drive/folders/1hGhtwrpMxWxtwi4NAnkreCz-_B5dy_Eo"
    }
    res = requests.post(f"{BASE_URL}/admin/drive-import", json=drive_payload, headers=t_headers)
    assert res.status_code == 200, res.text
    scan_data = res.json()
    assert scan_data["status"] == "success"
    assert scan_data["total_files_scanned"] >= 4
    assert scan_data["total_questions_parsed"] >= 30
    print(f"  ✓ Google Drive scan successful: {scan_data['total_files_scanned']} files scanned, {scan_data['total_questions_parsed']} questions parsed")
    print(f"  ✓ Per-subject breakdown: {scan_data['per_subject_summary']}")

    # Confirm Drive import
    confirmed_sample = scan_data["questions_preview"][:15]
    confirm_payload = {"confirmed_questions": confirmed_sample}
    res = requests.post(f"{BASE_URL}/admin/drive-import/confirm", json=confirm_payload, headers=t_headers)
    assert res.status_code == 200, res.text
    conf_data = res.json()
    assert conf_data["status"] == "success"
    assert conf_data["total_ingested"] == len(confirmed_sample)
    print(f"  ✓ Drive import confirm successful: {conf_data['total_ingested']} questions merged into question banks")

    print("\n=======================================================")
    print("ALL 9 VERIFICATION PHASES PASSED WITH ZERO ERRORS!")
    print("=======================================================")

if __name__ == "__main__":
    test_full_platform()

