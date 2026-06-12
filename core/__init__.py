"""
Sovereign Node 9010 - Core Python Engines Package

This package contains the deterministic core of the system:
- BBFB Engine (value / tau scoring)
- Deception Scanner (v3 + 8-rule merged ontology + structural signals)
- Facts Registry (Merkle-sealed persistent store)
- Truth Ledger (immutable audit chain)
- Sovereign Exit (hard 10% Tau refusal gate)
- Rule Verifier (ontology integrity)
- Monitoring (UI snapshot provider)
- Legal Affidavit Generator

Usage:
    from core import SovereignNode9010
    node = SovereignNode9010()
    snap = node.get_monitoring_snapshot()
"""

from .bbfb_engine import BBFBEngine
from .deception_scanner import DeceptionScanner
from .facts_registry import FactsRegistry
from .merkle_squeal import TruthLedger, MerkleSquealProtocol
from .sovereign_exit import SovereignExit
from .rule_verifier import RuleVerifier
from .monitoring import SystemMonitor
from .legal_affidavit_generator import generate_affidavit

__all__ = [
    "SovereignNode9010",
    "BBFBEngine",
    "DeceptionScanner",
    "FactsRegistry",
    "TruthLedger",
    "SovereignExit",
    "RuleVerifier",
    "SystemMonitor",
    "generate_affidavit",
]
