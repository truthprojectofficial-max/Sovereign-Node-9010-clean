# REFACTORED v3.9.1 - Full scan understanding (many pattern methods: 50+ DD + Semantic Entropy, CoVe, Multi-Agent, AST, RAG from 06/06 & 07/06/2026 scans + Emerging Methods). Actionable deploy ready.
from .deception_scanner import DeceptionScanner


class DeterministicDecisionLayer:
    """Thin deterministic wrapper around the multi-ontology deception scanner."""

    def __init__(self, mode: str = "merged"):
        self.scanner = DeceptionScanner(mode=mode)
        self.mode = mode

    def process(self, text: str, is_change_input: bool = False):
        result = self.scanner.analyze(text)
        action = "DEFER" if result["is_deceptive"] else "GO"
        reason = "High deception score" if result["is_deceptive"] else "Within limits"
        return {
            "final_action": action,
            "reason": reason,
            "deception": result,
            "ontology": result.get("ontology_mode"),
        }
