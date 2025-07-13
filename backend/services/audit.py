import aiofiles
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


class AuditService:
    """Simple asynchronous audit logger."""

    def __init__(self, audit_file: str | Path):
        self.audit_file = Path(audit_file)
        self.audit_file.parent.mkdir(parents=True, exist_ok=True)

    async def log(self, entry: Dict[str, Any]) -> None:
        """Append an audit entry as JSON."""
        entry = entry.copy()
        entry["timestamp"] = datetime.utcnow().isoformat()
        async with aiofiles.open(self.audit_file, "a") as f:
            await f.write(json.dumps(entry) + "\n")
