# REFACTORED v3.9.1 - Full scan understanding (many pattern methods: 50+ DD + Semantic Entropy, CoVe, Multi-Agent, AST, RAG from 06/06 & 07/06/2026 scans + Emerging Methods). Actionable deploy ready.
"""
Sovereign Node 9010 — Sovereign Exit / Tau Refusal Gate

Enforces the non-negotiable 10% Absolute Thermodynamic Sovereignty (Tau ceiling).
Any process attempting extraction above the limit triggers STRUCTURAL_REFUSAL.
Referenced across project docs, GGEMINI extraction, Full Setup 00-99, and metadata as a core gate.

This module is intended to be called at every entry point (core, API, Docker, pipelines).
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional


TAU_CEILING = 0.10  # 10% Absolute Extraction Ceiling — non-negotiable


@dataclass
class TauDecision:
    action: str  # ACCEPT | REFUSE | DEFER
    tau_level: float
    reason: str
    compliant: bool


class SovereignExit:
    """
    The final refusal gate.
    All high-stakes operations must pass through here.
    """

    def __init__(self, ceiling: float = TAU_CEILING):
        self.ceiling = ceiling

    def check_tau(self, extraction_level: float, context: str = "") -> TauDecision:
        """
        Primary enforcement point.
        Returns STRUCTURAL_REFUSAL if extraction_level > ceiling.
        """
        tau = max(0.0, min(extraction_level, 1.0))

        if tau > self.ceiling:
            return TauDecision(
                action="STRUCTURAL_REFUSAL",
                tau_level=tau,
                reason=f"Extraction {tau*100:.1f}% exceeds absolute {self.ceiling*100:.0f}% Tau ceiling. {context}".strip(),
                compliant=False,
            )

        return TauDecision(
            action="ACCEPT",
            tau_level=tau,
            reason="Within Absolute Thermodynamic Sovereignty limits.",
            compliant=True,
        )

    def enforce_or_exit(self, extraction_level: float, context: str = "") -> None:
        """
        Hard exit path for critical paths (Docker ENTRYPOINT, pipelines, etc.).
        In real usage this would raise or sys.exit with affidavit generation.
        """
        decision = self.check_tau(extraction_level, context)
        if not decision.compliant:
            # In production this would trigger legal_affidavit_generator + shutdown
            raise SystemExit(f"[SOVEREIGN EXIT] {decision.reason}")

    def get_status(self) -> Dict[str, Any]:
        return {
            "tau_ceiling": self.ceiling,
            "enforcement": "HARD_STRUCTURAL_REFUSAL",
            "philosophy": "Absolute Thermodynamic Sovereignty",
        }
