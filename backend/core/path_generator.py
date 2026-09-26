import networkx as nx
from typing import Dict, List, Any, Optional
from backend.core.gap_analyzer import GapAnalyzer


class PathGenerator:
    """
    Generates a personalized, prerequisite-ordered learning path.
    Prioritizes root knowledge gaps and builds a topologically sound progression
    scoped to any of the 6 subjects.
    """

    def __init__(self, gap_analyzer: GapAnalyzer):
        self.gap_analyzer = gap_analyzer

    def generate_path(self, mastery_map: Dict[str, float], subject_id: str = "python") -> Dict[str, Any]:
        """
        Builds the ordered curriculum path based on prerequisite DAG and student mastery.
        """
        gap_analysis = self.gap_analyzer.analyze_student(mastery_map, subject_id=subject_id)
        dag = self.gap_analyzer.subject_dags.get(subject_id)
        if not dag:
            # Fallback to first available DAG
            subject_id = list(self.gap_analyzer.subject_dags.keys())[0] if self.gap_analyzer.subject_dags else "python"
            dag = self.gap_analyzer.subject_dags.get(subject_id, nx.DiGraph())

        concepts_dict = self.gap_analyzer.subject_concepts.get(subject_id, {})
        mastery_threshold = self.gap_analyzer.mastery_threshold

        root_bottleneck = gap_analysis.get("root_bottleneck_concept")
        target_cid = root_bottleneck["concept_id"] if root_bottleneck else None

        # Build priority scores for all concepts in topological order
        steps = []
        try:
            topo_order = list(nx.topological_sort(dag))
        except Exception:
            topo_order = list(dag.nodes())

        for idx, full_cid in enumerate(topo_order, start=1):
            node_data = dag.nodes[full_cid]
            raw_id = node_data.get("raw_id", full_cid.split(".")[-1])
            name = node_data.get("name", raw_id)
            diff = node_data.get("difficulty_base", 3)

            score = mastery_map.get(full_cid, mastery_map.get(raw_id, 0.25))
            is_mastered = score >= mastery_threshold
            prereqs = list(dag.predecessors(full_cid))
            unmet_prereqs = [
                p for p in prereqs
                if mastery_map.get(p, mastery_map.get(dag.nodes[p].get("raw_id"), 0.25)) < mastery_threshold
            ]
            downstream = list(dag.successors(full_cid))

            priority = round(
                ((1.0 - score) * 0.5 + (1.0 / max(1, diff)) * 0.3 + min(0.2, 0.05 * len(downstream))) * (diff / 3.0),
                3
            )

            # Determine status
            if is_mastered:
                status = "mastered"
                reason = "Concept already mastered. Retained in memory archive."
            elif target_cid and (full_cid == target_cid or raw_id == target_cid.split(".")[-1]):
                status = "target_focus"
                reason = "Primary intervention target: Immediate highest-impact prerequisite bottleneck."
            elif unmet_prereqs:
                status = "pending_prereq"
                p_names = [dag.nodes[p].get("name", p) for p in unmet_prereqs]
                reason = f"Blocked until foundational prerequisites ({', '.join(p_names)}) are mastered."
            else:
                status = "ready_to_learn"
                reason = "All prerequisites satisfied. Ready for structured study."

            steps.append({
                "sequence_order": idx,
                "concept_id": full_cid,
                "raw_concept_id": raw_id,
                "concept_name": name,
                "difficulty_base": diff,
                "priority_score": priority,
                "current_mastery": round(score, 3),
                "status": status,
                "reason": reason,
                "prerequisites": [dag.nodes[p].get("raw_id", p) for p in prereqs],
            })

        subj_name = self.gap_analyzer.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)
        strategy = (
            f"Prerequisite-First Topological Sequencing for {subj_name}: Root bottlenecks are scheduled first "
            f"to prevent compounding cognitive load. Once foundational mastery exceeds {int(mastery_threshold*100)}%, "
            f"dependent concepts are automatically unlocked."
        )

        return {
            "subject_id": subject_id,
            "subject_name": subj_name,
            "target_gap_concept": root_bottleneck,
            "curriculum": steps,
            "learning_strategy": strategy,
            "gap_analysis": gap_analysis,
        }
