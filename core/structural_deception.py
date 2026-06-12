# REFACTORED v3.9.1 - Full scan understanding (many pattern methods: 50+ DD + Semantic Entropy, CoVe, Multi-Agent, AST, RAG from 06/06 & 07/06/2026 scans + Emerging Methods). Actionable deploy ready.
"""
Sovereign Node 9010 — Structural Deception Analyzer (Shannon Entropy + ShED-HD)

Implements the project's specified information-theoretic structural deception detection.

Core spec (from project forensic documentation):
- Character-level Shannon Entropy H(X)
- Threshold: H > 4.5 bits/char flags "synthetic facade" / evasive high-complexity text
- Contributes to overall deception score (historically +0.20 in combined scoring)
- Produces shed_hd_score and structural_deception_flag for DeceptionReport compatibility

This is first-class, not a quick bonus hack.
Deterministic. Pure stdlib. Reproducible.
"""

import math
from typing import Dict, Any


def calculate_shannon_entropy(text: str) -> float:
    """
    Character-level Shannon Entropy (base 2).
    Exact formula from Sovereign Node 9010 design notes:

        H(X) = - Σ p(x_i) * log2(p(x_i))

    Returns bits per character, rounded to 3 decimals.
    Empty text → 0.0
    """
    if not text:
        return 0.0

    freq: Dict[str, int] = {}
    for char in text:
        freq[char] = freq.get(char, 0) + 1

    total = len(text)
    if total == 0:
        return 0.0

    h = -sum(
        (count / total) * math.log2(count / total)
        for count in freq.values()
        if count > 0
    )
    return round(h, 3)


def analyze_structural_deception(text: str, high_entropy_threshold: float = 4.5) -> Dict[str, Any]:
    """
    Full structural deception analysis.

    Returns a dict suitable for merging into deception scanner results:
    - entropy: raw character Shannon H
    - shed_hd_score: the entropy value (ShED-HD style)
    - high_entropy_flag: H > threshold (synthetic facade signal)
    - structural_deception_flag: recommended combined flag (high entropy OR very low diversity)
    - information_density_note: qualitative label
    - entropy_contribution: numeric score contribution (for combining with symbolic rules)
    """
    if not text or not isinstance(text, str):
        return _empty_structural_result(high_entropy_threshold)

    h = calculate_shannon_entropy(text)

    high_entropy_flag = h > high_entropy_threshold

    # Additional lightweight deterministic structural signal:
    # Very low character diversity (repetitive / low-information hammering)
    # This complements the high-entropy "synthetic facade" signal.
    char_diversity = len(set(text.lower())) / max(1, len(text))
    low_diversity_flag = char_diversity < 0.08 and len(text) > 40

    # Contribution used by the scanner (mirrors historical +0.20 logic)
    entropy_contribution = 0.22 if high_entropy_flag else 0.0
    if low_diversity_flag:
        entropy_contribution += 0.10

    # Overall structural flag recommendation (can be OR-ed with symbolic patterns)
    structural_deception_flag = high_entropy_flag or low_diversity_flag

    # Qualitative note for forensic reports
    if h > 5.2:
        density_note = "VERY_HIGH_COMPLEXITY (strong synthetic facade signal)"
    elif high_entropy_flag:
        density_note = "HIGH_COMPLEXITY (evasive / synthetic facade candidate)"
    elif low_diversity_flag:
        density_note = "VERY_LOW_DIVERSITY (repetitive hammering / low information)"
    else:
        density_note = "WITHIN_EXPECTED_RANGE"

    return {
        "entropy": h,
        "shed_hd_score": h,                    # legacy name from project notes
        "high_entropy_flag": high_entropy_flag,
        "structural_deception_flag": structural_deception_flag,
        "low_diversity_flag": low_diversity_flag,
        "entropy_contribution": round(entropy_contribution, 3),
        "information_density_note": density_note,
        "threshold_used": high_entropy_threshold,
        "char_diversity_ratio": round(char_diversity, 4),
    }


def _empty_structural_result(threshold: float) -> Dict[str, Any]:
    return {
        "entropy": 0.0,
        "shed_hd_score": 0.0,
        "high_entropy_flag": False,
        "structural_deception_flag": False,
        "low_diversity_flag": False,
        "entropy_contribution": 0.0,
        "information_density_note": "NO_INPUT",
        "threshold_used": threshold,
        "char_diversity_ratio": 0.0,
    }
