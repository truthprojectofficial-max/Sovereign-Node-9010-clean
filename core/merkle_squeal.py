import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class MerkleSquealProtocol:
    @staticmethod
    def create_squeal_report(data: Dict[str, Any]) -> Dict[str, Any]:
        payload = json.dumps(data, sort_keys=True).encode()
        return {"hash": hashlib.sha256(payload).hexdigest(), "timestamp": datetime.now(timezone.utc).isoformat()}


class TruthLedger:
    def __init__(self, path: str = "03_Vault/truth_ledger.json"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.chain: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.path.exists():
            try:
                self.chain = json.loads(self.path.read_text(encoding="utf-8"))
            except Exception:
                self.chain = []

    def _save(self):
        self.path.write_text(json.dumps(self.chain, indent=2, sort_keys=True), encoding="utf-8")

    def _compute_hash(self, entry: Dict[str, Any]) -> str:
        payload = json.dumps(entry, sort_keys=True).encode()
        return hashlib.sha256(payload).hexdigest()

    def add_entry(self, data: Dict[str, Any], entry_type: str = "EVENT") -> str:
        entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "type": entry_type,
            "data": data,
        }
        if self.chain:
            entry["previous_hash"] = self.chain[-1]["hash"]
        entry["hash"] = self._compute_hash(entry)
        self.chain.append(entry)
        self._save()
        return entry["hash"]

    def get_last_root(self) -> Optional[str]:
        return self.chain[-1]["hash"] if self.chain else None
