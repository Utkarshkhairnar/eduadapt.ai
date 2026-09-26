import os
import yaml
import networkx as nx
from typing import Dict, List, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
GRAPHS_DIR = os.path.join(DATA_DIR, "concept_graphs")
REGISTRY_PATH = os.path.join(GRAPHS_DIR, "subjects_registry.yaml")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "configs", "default.yaml")


class GapAnalyzer:
    """
    Analyzes student knowledge gaps against directed prerequisite concept graphs across 6 subjects.
    Walks backward from any concept below mastery_threshold to find the earliest unmastered prerequisite
    — the true root gap, not just the symptom topic.
    """

    def __init__(self, registry_path: str = REGISTRY_PATH, config_path: str = CONFIG_PATH):
        self.registry_path = registry_path
        self.config_path = config_path
        self.config = self._load_yaml(config_path)
        self.mastery_threshold = self.config.get("mastery", {}).get("threshold", 0.70)
        self.weak_threshold = self.config.get("mastery", {}).get("weak_threshold", 0.45)

        self.subject_dags: Dict[str, nx.DiGraph] = {}
        self.subject_concepts: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self.subjects_metadata: Dict[str, Dict[str, Any]] = {}

        self._load_all_subjects()

    def _load_yaml(self, path: str) -> Dict[str, Any]:
        if os.path.exists(path):
            with open(path, "r") as f:
                return yaml.safe_load(f) or {}
        return {}

    def _load_all_subjects(self):
        reg = self._load_yaml(self.registry_path)
        subjects = reg.get("subjects", [])

        # Default fallback if registry not found
        if not subjects:
            subjects = [
                {"id": "maths3", "graph_file": "maths3.yaml", "display_name": "Maths 3"},
                {"id": "automata_theory", "graph_file": "automata_theory.yaml", "display_name": "Automata Theory"},
                {"id": "adsa", "graph_file": "adsa.yaml", "display_name": "ADSA"},
                {"id": "java", "graph_file": "java.yaml", "display_name": "Java"},
                {"id": "c_programming", "graph_file": "c_programming.yaml", "display_name": "C"},
                {"id": "python", "graph_file": "python.yaml", "display_name": "Python"},
            ]

        for s in subjects:
            sid = s["id"]
            self.subjects_metadata[sid] = s
            dag = nx.DiGraph()
            concepts_dict = {}

            gfile = os.path.join(GRAPHS_DIR, s.get("graph_file", f"{sid}.yaml"))
            gdata = self._load_yaml(gfile)

            for c in gdata.get("concepts", []):
                raw_id = c["id"]
                full_id = f"{sid}.{raw_id}"
                c_copy = dict(c)
                c_copy["subject_id"] = sid
                c_copy["namespaced_id"] = full_id
                c_copy["raw_id"] = raw_id
                concepts_dict[full_id] = c_copy
                concepts_dict[raw_id] = c_copy  # support lookup by raw id as well

                dag.add_node(
                    full_id,
                    raw_id=raw_id,
                    name=c["name"],
                    category=c.get("category", "Core"),
                    difficulty_base=c.get("difficulty_base", 3),
                    description=c.get("description", ""),
                    subject_id=sid
                )

            # Add edges (prerequisite -> concept)
            for c in gdata.get("concepts", []):
                raw_id = c["id"]
                full_id = f"{sid}.{raw_id}"
                for prereq in c.get("prerequisites", []):
                    full_prereq = f"{sid}.{prereq}"
                    if full_prereq in dag:
                        dag.add_edge(full_prereq, full_id)

            self.subject_dags[sid] = dag
            self.subject_concepts[sid] = concepts_dict

    def find_earliest_unmastered_prerequisite(
        self,
        subject_id: str,
        concept_id: str,
        mastery_map: Dict[str, float]
    ) -> str:
        """
        Walk backward from any concept below mastery_threshold to find the earliest unmastered
        prerequisite — that's the true root gap, not just the symptom topic.
        """
        dag = self.subject_dags.get(subject_id)
        if not dag:
            return concept_id

        full_cid = f"{subject_id}.{concept_id}" if not concept_id.startswith(f"{subject_id}.") else concept_id
        if full_cid not in dag:
            return concept_id

        # BFS / DFS backward through ancestors
        visited = set()
        queue = [full_cid]
        earliest_candidate = full_cid

        while queue:
            curr = queue.pop(0)
            visited.add(curr)
            preds = list(dag.predecessors(curr))
            unmastered_preds = [
                p for p in preds
                if mastery_map.get(p, mastery_map.get(dag.nodes[p].get("raw_id"), 0.25)) < self.mastery_threshold
            ]

            if unmastered_preds:
                # If predecessors are unmastered, they are earlier in the chain
                earliest_candidate = unmastered_preds[0]
                for p in unmastered_preds:
                    if p not in visited:
                        queue.append(p)

        return earliest_candidate

    def analyze_student(
        self,
        mastery_map: Dict[str, float],
        subject_id: str = "python"
    ) -> Dict[str, Any]:
        """
        Takes a mapping of concept_id -> current mastery score.
        Computes weak concepts + their unmet prerequisites via graph traversal.
        """
        dag = self.subject_dags.get(subject_id)
        if not dag:
            # Fallback to first available DAG
            subject_id = list(self.subject_dags.keys())[0] if self.subject_dags else "python"
            dag = self.subject_dags.get(subject_id, nx.DiGraph())

        concepts_dict = self.subject_concepts.get(subject_id, {})
        all_concepts = list(dag.nodes())
        gaps_list = []
        mastered_count = 0

        # Topological sort (root prerequisites first)
        try:
            topo_order = list(nx.topological_sort(dag))
        except Exception:
            topo_order = all_concepts

        for full_cid in topo_order:
            node_data = dag.nodes[full_cid]
            raw_id = node_data.get("raw_id", full_cid.split(".")[-1])
            name = node_data.get("name", raw_id)
            diff = node_data.get("difficulty_base", 3)

            # Score check: try full_cid, then raw_id
            score = mastery_map.get(full_cid, mastery_map.get(raw_id, 0.25))
            is_mastered = score >= self.mastery_threshold
            if is_mastered:
                mastered_count += 1

            # Prerequisites check
            prereqs = list(dag.predecessors(full_cid))
            unmet_prereqs = [
                p for p in prereqs
                if mastery_map.get(p, mastery_map.get(dag.nodes[p].get("raw_id"), 0.25)) < self.mastery_threshold
            ]

            # Successors check
            downstream = list(dag.successors(full_cid))
            blocking_for = [
                d for d in downstream
                if mastery_map.get(d, mastery_map.get(dag.nodes[d].get("raw_id"), 0.25)) < self.mastery_threshold
            ]

            is_gap = not is_mastered
            gap_severity = round((1.0 - score) * (diff / 3.0) * (1.0 + 0.2 * len(blocking_for)), 3)

            # Walk backward to find the true root bottleneck prerequisite
            root_cause_id = self.find_earliest_unmastered_prerequisite(subject_id, full_cid, mastery_map)
            is_root = (root_cause_id == full_cid and is_gap)

            if is_gap:
                rec_str = ""
                if unmet_prereqs:
                    prereq_names = [dag.nodes[p].get("name", p) for p in unmet_prereqs]
                    rec_str = f"Blocked by unmet prerequisite(s): {', '.join(prereq_names)}. Master foundation first."
                elif len(blocking_for) > 0:
                    downstream_names = [dag.nodes[d].get("name", d) for d in blocking_for[:2]]
                    rec_str = f"Critical root prerequisite! Unlocks downstream topics: {', '.join(downstream_names)}."
                else:
                    rec_str = "Focus topic for targeted reinforcement."

                gaps_list.append({
                    "concept_id": full_cid,
                    "raw_concept_id": raw_id,
                    "concept_name": name,
                    "difficulty_base": diff,
                    "mastery_score": round(score, 3),
                    "is_gap": True,
                    "is_root_bottleneck": is_root,
                    "root_cause_id": root_cause_id,
                    "unmet_prerequisites": [dag.nodes[p].get("raw_id", p) for p in unmet_prereqs],
                    "blocking_for": [dag.nodes[d].get("raw_id", d) for d in blocking_for],
                    "gap_severity": gap_severity,
                    "recommendation": rec_str,
                })

        # Identify primary root bottleneck
        root_bottleneck = None
        if gaps_list:
            sorted_candidates = sorted(
                gaps_list,
                key=lambda x: (
                    not x["is_root_bottleneck"],
                    x["difficulty_base"],
                    -x["gap_severity"]
                )
            )
            root_bottleneck = sorted_candidates[0]

        # Graph nodes and edges for visualization
        graph_nodes = []
        for full_cid in topo_order:
            node_data = dag.nodes[full_cid]
            raw_id = node_data.get("raw_id", full_cid.split(".")[-1])
            score = mastery_map.get(full_cid, mastery_map.get(raw_id, 0.25))
            status = "mastered" if score >= self.mastery_threshold else "gap_dependent"

            if root_bottleneck and full_cid == root_bottleneck["concept_id"]:
                status = "gap_bottleneck"
            elif score < self.mastery_threshold and all(
                mastery_map.get(p, mastery_map.get(dag.nodes[p].get("raw_id"), 0.25)) >= self.mastery_threshold
                for p in dag.predecessors(full_cid)
            ):
                status = "ready_to_learn"

            graph_nodes.append({
                "id": full_cid,
                "raw_id": raw_id,
                "name": node_data.get("name", raw_id),
                "difficulty_base": node_data.get("difficulty_base", 3),
                "mastery_score": round(score, 3),
                "status": status,
            })

        graph_edges = []
        for u, v in dag.edges():
            u_score = mastery_map.get(u, mastery_map.get(dag.nodes[u].get("raw_id"), 0.25))
            is_blocking = u_score < self.mastery_threshold
            graph_edges.append({
                "source": u,
                "target": v,
                "is_blocking": is_blocking,
            })

        subj_name = self.subjects_metadata.get(subject_id, {}).get("display_name", subject_id)
        narrative = self._generate_narrative(root_bottleneck, gaps_list, mastered_count, len(all_concepts), subj_name)

        return {
            "subject_id": subject_id,
            "subject_name": subj_name,
            "mastery_threshold": self.mastery_threshold,
            "total_concepts": len(all_concepts),
            "mastered_count": mastered_count,
            "gap_count": len(gaps_list),
            "root_bottleneck_concept": root_bottleneck,
            "gaps": gaps_list,
            "graph_nodes": graph_nodes,
            "graph_edges": graph_edges,
            "analysis_narrative": narrative,
        }

    def _generate_narrative(
        self,
        root_bottleneck: Optional[Dict[str, Any]],
        gaps: List[Dict[str, Any]],
        mastered: int,
        total: int,
        subject_name: str
    ) -> str:
        if mastered == total and total > 0:
            return f"Exceptional performance! Student demonstrates comprehensive mastery across all {subject_name} concepts."

        if not root_bottleneck:
            return f"Student has mastered {mastered}/{total} concepts in {subject_name}. Minor reinforcement suggested."

        rb_name = root_bottleneck["concept_name"]
        diff = root_bottleneck["difficulty_base"]
        blocking_count = len(root_bottleneck["blocking_for"])

        narrative = (
            f"Prerequisite Graph Traversal identified '{rb_name}' (Base Difficulty {diff}/7, Mastery: {int(root_bottleneck['mastery_score']*100)}%) "
            f"as the primary root bottleneck in {subject_name}. Because '{rb_name}' directly gates {blocking_count} downstream "
            f"concepts, remediating this prerequisite first resolves the foundational blockage."
        )
        return narrative
