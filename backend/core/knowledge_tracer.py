import os
import yaml
from typing import Dict, Any, Tuple

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "configs", "default.yaml")


def load_config() -> Dict[str, Any]:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                return yaml.safe_load(f) or {}
        except Exception:
            return {}
    return {}


class BayesianKnowledgeTracer:
    """
    Standard Corbett & Anderson Bayesian Knowledge Tracing (BKT) model.
    Models student latent mastery probability P(L_t) over successive observation steps.
    """

    def __init__(
        self,
        p_init: float = 0.25,
        p_transit: float = 0.18,
        p_slip: float = 0.10,
        p_guess: float = 0.20,
    ):
        self.p_init = p_init
        self.p_transit = p_transit
        self.p_slip = p_slip
        self.p_guess = p_guess

    @classmethod
    def from_config(cls) -> "BayesianKnowledgeTracer":
        cfg = load_config()
        bkt_cfg = cfg.get("bkt", {})
        return cls(
            p_init=bkt_cfg.get("p_init", 0.25),
            p_transit=bkt_cfg.get("p_transit", 0.18),
            p_slip=bkt_cfg.get("p_slip", 0.10),
            p_guess=bkt_cfg.get("p_guess", 0.20),
        )

    def update(
        self,
        prior_p_l: float,
        is_correct: bool,
        difficulty: float = 0.5,
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Updates latent mastery probability given an item observation.
        Difficulty optionally modulates guess and slip probabilities (harder items reduce guess rate).
        """
        # Clamp prior probability
        p_l = max(0.01, min(0.99, prior_p_l))

        # Dynamically scale slip and guess by difficulty (supports [1, 7] or [0.1, 1.0])
        if difficulty > 1.0:
            diff_factor = max(0.0, min(1.0, (difficulty - 1.0) / 6.0))
        else:
            diff_factor = max(0.1, min(1.0, difficulty))
        effective_guess = max(0.05, self.p_guess * (1.2 - 0.4 * diff_factor))
        effective_slip = min(0.30, self.p_slip * (0.8 + 0.4 * diff_factor))

        if is_correct:
            # P(L_t | Correct) = [P(L_t) * (1 - P(S))] / [P(L_t) * (1 - P(S)) + (1 - P(L_t)) * P(G)]
            numerator = p_l * (1.0 - effective_slip)
            denominator = numerator + ((1.0 - p_l) * effective_guess)
            formula_name = "Bayes Rule (Observation: Correct)"
        else:
            # P(L_t | Incorrect) = [P(L_t) * P(S)] / [P(L_t) * P(S) + (1 - P(L_t)) * (1 - P(G))]
            numerator = p_l * effective_slip
            denominator = numerator + ((1.0 - p_l) * (1.0 - effective_guess))
            formula_name = "Bayes Rule (Observation: Incorrect)"

        posterior_obs = numerator / max(1e-9, denominator)

        # Transition Step: P(L_t+1) = P(L_t | Obs) + (1 - P(L_t | Obs)) * P(T)
        transit_gain = (1.0 - posterior_obs) * self.p_transit
        new_p_l = posterior_obs + transit_gain

        # Clamp to [0.01, 0.99]
        new_p_l = max(0.01, min(0.99, new_p_l))
        delta = new_p_l - prior_p_l

        details = {
            "prior_mastery": round(prior_p_l, 4),
            "posterior_given_evidence": round(posterior_obs, 4),
            "transit_addition": round(transit_gain, 4),
            "new_mastery": round(new_p_l, 4),
            "delta": round(delta, 4),
            "formula_used": formula_name,
            "effective_slip": round(effective_slip, 4),
            "effective_guess": round(effective_guess, 4),
            "p_transit": self.p_transit,
        }

        return round(new_p_l, 4), details
