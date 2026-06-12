# REFACTORED v3.9.1 - Full scan understanding (many pattern methods: 50+ DD + Semantic Entropy, CoVe, Multi-Agent, AST, RAG from 06/06 & 07/06/2026 scans + Emerging Methods). Actionable deploy ready.
"""
Sovereign Node 9010 - BBFB Engine (Barnett Binary Faith-Basis)
Deterministic Multi-Criteria Decision Analysis • LAW / GRACE / FRUIT

This is the core value/tau engine. Re-created as part of the full Python core build.
# Refactored v3.9.1 - Full scan understanding: Deception (36-pattern + entropy), BBFB (LAW/GRACE/FRUIT), 10% Tau, 00-99 hierarchy, NIZK/Merkle from original 06/06/2026 & 07/06/2026 scans
"""

from dataclasses import dataclass
from typing import List, Dict, Any
import math


@dataclass
class BBFBEvaluation:
    law_results: List[Dict]
    grace: Dict
    fruit: Dict
    overall_compliant: bool
    composite_value_score: float
    tau_level: float
    recommendation: str


class BBFBEngine:
    def __init__(self):
        self.tau_ceiling = 0.10  # 10% Absolute Extraction Ceiling

    def _law_gate(self, value: float, threshold: float = 0.01) -> bool:
        """Hard binary veto gate"""
        return value >= threshold

    def _grace_risk(
        self,
        failure_probability: float,
        technical_debt: float,
        compliance_gap: float
    ) -> Dict:
        """GRACE — Non-linear quadratic penalty"""
        QUAD_COEFF = 2.0
        raw_penalty = QUAD_COEFF * (
            failure_probability ** 2 +
            technical_debt ** 2 +
            compliance_gap ** 2
        )
        max_penalty = QUAD_COEFF * 3
        normalized_penalty = min(raw_penalty / max_penalty, 1.0)

        if normalized_penalty > 0.75:
            risk_level = "CRITICAL"
        elif normalized_penalty > 0.5:
            risk_level = "HIGH"
        elif normalized_penalty > 0.25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "raw_penalty": round(raw_penalty, 4),
            "normalized_penalty": round(normalized_penalty, 4),
            "risk_level": risk_level
        }

    def _fruit_score(self, criteria: List[Dict]) -> Dict:
        """FRUIT — Weighted Product Model (WPM)"""
        cvs = 1.0
        weighted_scores = []

        for c in criteria:
            weighted = c["value"] ** c["weight"]
            cvs *= weighted
            weighted_scores.append({
                "name": c["name"],
                "weighted": round(weighted, 6)
            })

        return {
            "composite_value_score": round(cvs, 6),
            "weighted_scores": weighted_scores,
            "compliant": cvs >= 0.0005
        }

    def evaluate(
        self,
        cost: float,
        performance: float,
        failure_probability: float,
        technical_debt: float,
        compliance_gap: float,
        extraction_level: float = 0.0
    ) -> BBFBEvaluation:
        """
        Main BBFB Evaluation
        Returns full deterministic scoring + Tau compliance
        """

        # LAW Gates (hard binary)
        law_results = [
            {"metric": "cost", "value": cost, "threshold": 0.01,
             "passed": self._law_gate(cost)},
            {"metric": "performance", "value": performance, "threshold": 0.01,
             "passed": self._law_gate(performance)},
        ]

        # GRACE Risk
        grace = self._grace_risk(failure_probability, technical_debt, compliance_gap)

        # FRUIT Scoring
        fruit = self._fruit_score([
            {"name": "cost", "value": cost, "weight": 0.4},
            {"name": "performance", "value": performance, "weight": 0.3},
            {"name": "reliability", "value": 1 - failure_probability, "weight": 0.2},
            {"name": "compliance", "value": 1 - compliance_gap, "weight": 0.1},
        ])

        # Overall Compliance
        all_law_passed = all(l["passed"] for l in law_results)
        overall_compliant = (
            all_law_passed and
            fruit["compliant"] and
            grace["risk_level"] != "CRITICAL"
        )

        # Tau Level Check (10% Extraction Ceiling)
        tau_level = min(extraction_level, 1.0)
        tau_compliant = tau_level <= self.tau_ceiling

        # Final Recommendation
        if not tau_compliant:
            recommendation = "STRUCTURAL_REFUSAL"
        elif not overall_compliant:
            recommendation = "NON_COMPLIANT"
        else:
            recommendation = "COMPLIANT"

        return BBFBEvaluation(
            law_results=law_results,
            grace=grace,
            fruit=fruit,
            overall_compliant=overall_compliant and tau_compliant,
            composite_value_score=fruit["composite_value_score"],
            tau_level=tau_level,
            recommendation=recommendation
        )
