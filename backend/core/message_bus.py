import json
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, AsyncGenerator
from backend.models.schemas import BusMessage, AuditLogEntry
from backend.models.enums import MessageType
from backend.core.db import get_connection

class MessageBus:
    def __init__(self):
        self._listeners: List[asyncio.Queue] = []
        self._history: List[BusMessage] = []

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        # Pre-seed subscriber with existing messages if desired
        self._listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._listeners:
            self._listeners.remove(q)

    def publish(
        self,
        sender: str,
        recipient: str,
        message_type: MessageType,
        summary: str,
        payload: Optional[Dict[str, Any]] = None,
        referenced_ids: Optional[List[str]] = None,
        is_llm: bool = False,
        record_audit: bool = True
    ) -> BusMessage:
        msg = BusMessage(
            id=f"msg_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.utcnow().isoformat() + "Z",
            sender=sender,
            recipient=recipient,
            message_type=message_type,
            summary=summary,
            payload=payload or {},
            referenced_ids=referenced_ids or [],
            is_llm=is_llm
        )

        self._history.append(msg)

        # Persist to SQLite
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO bus_messages (id, timestamp, sender, recipient, message_type, summary, payload, referenced_ids, is_llm)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    msg.id,
                    msg.timestamp,
                    msg.sender,
                    msg.recipient,
                    msg.message_type.value if hasattr(msg.message_type, 'value') else str(msg.message_type),
                    msg.summary,
                    json.dumps(msg.payload),
                    json.dumps(msg.referenced_ids),
                    1 if msg.is_llm else 0
                )
            )

            if record_audit:
                audit_id = f"aud_{uuid.uuid4().hex[:8]}"
                cursor.execute(
                    """
                    INSERT INTO audit_log (id, timestamp, actor, action, payload_hash, summary)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        audit_id,
                        msg.timestamp,
                        msg.sender,
                        f"PUBLISH_{msg.message_type.value if hasattr(msg.message_type, 'value') else str(msg.message_type)}",
                        msg.id,
                        f"{msg.sender} -> {msg.recipient}: {msg.summary}"
                    )
                )

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error persisting bus message: {e}")

        # Notify active SSE subscribers
        for q in list(self._listeners):
            try:
                q.put_nowait(msg)
            except Exception:
                pass

        return msg

    def get_messages(self, limit: int = 100) -> List[BusMessage]:
        return self._history[-limit:]

# Singleton instance
global_bus = MessageBus()
