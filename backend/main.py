import os
import json
import uuid
import asyncio
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# --- CONFIGURATION ---
ALERTS_FILE = "/var/ossec/logs/alerts/alerts.json"
DB_FILE = "/opt/siem-backend/alerts.db"
RETENTION_LIMIT = 10000
STARTUP_LOAD_LIMIT = 50
PRUNE_INTERVAL = 100

# Correlation Config
CORRELATION_WINDOW_SECONDS = 300  # 5 minutes
CORRELATION_THRESHOLD = 5         # 5 alerts trigger a detection

# ✅ NEW: Static MITRE ATT&CK Mapping Table
MITRE_MAPPING = {
    # Authentication & Access
    "authentication_failed": {"tactic": "Credential Access", "technique_id": "T1110", "technique_name": "Brute Force"},
    "invalid_login":        {"tactic": "Credential Access", "technique_id": "T1110", "technique_name": "Brute Force"},
    "sshd":                 {"tactic": "Initial Access",    "technique_id": "T1078", "technique_name": "Valid Accounts"},
    "sudo":                 {"tactic": "Privilege Escalation", "technique_id": "T1078", "technique_name": "Valid Accounts"},
    
    # Execution & Scripting
    "shell":                {"tactic": "Execution", "technique_id": "T1059", "technique_name": "Command and Scripting Interpreter"},
    "script":               {"tactic": "Execution", "technique_id": "T1059", "technique_name": "Command and Scripting Interpreter"},
    "process_creation":     {"tactic": "Execution", "technique_id": "T1204", "technique_name": "User Execution"},
    
    # Internal Correlation Rule (as requested)
    "correlation":          {"tactic": "Defense Evasion", "technique_id": "T1562", "technique_name": "Impair Defenses"},
    
    # Fallbacks/Common Groups
    "syslog":               {"tactic": "Discovery", "technique_id": "T1082", "technique_name": "System Information Discovery"},
    "web":                  {"tactic": "Initial Access", "technique_id": "T1190", "technique_name": "Exploit Public-Facing Application"},
}

app = FastAPI(title="SIEM Backend")

# Global counter to track when to prune
alert_counter = 0

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# DATABASE LAYER
# =====================
def init_db():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT,
                    level TEXT,
                    category TEXT,
                    data TEXT
                )
            """)
            conn.commit()
            print(f"✅ Database initialized: {DB_FILE} (WAL Mode)")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

def save_alert_sync(alert: Dict[str, Any]):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            conn.execute(
                "INSERT INTO alerts (id, timestamp, level, category, data) VALUES (?, ?, ?, ?, ?)",
                (alert["id"], alert["timestamp"], alert["level"], alert["category"], json.dumps(alert))
            )
            conn.commit()
    except Exception as e:
        print(f"⚠️ Failed to persist alert: {e}")

def get_recent_alerts_sync(limit: int) -> List[Dict[str, Any]]:
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.execute("SELECT data FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            alerts = [json.loads(row[0]) for row in rows]
            return alerts[::-1]
    except Exception as e:
        print(f"⚠️ Failed to load recent alerts: {e}")
        return []

def prune_db_sync(limit: int):
    try:
        with sqlite3.connect(DB_FILE) as conn:
            conn.execute(f"DELETE FROM alerts WHERE id NOT IN (SELECT id FROM alerts ORDER BY timestamp DESC LIMIT ?)", (limit,))
            conn.commit()
            print(f"🧹 Database pruned (Retention: {limit})")
    except Exception as e:
        print(f"⚠️ Database pruning failed: {e}")

# =====================
# NORMALIZER & ENRICHMENT
# =====================
def map_severity(level: int) -> str:
    if level >= 12: return "critical"
    if level >= 7:  return "high"
    if level >= 5:  return "medium"
    return "low"

def enrich_alert(alert: dict) -> dict:
    """
    ✅ NEW: Applies MITRE ATT&CK context based on alert category or keywords.
    """
    # 1. Try exact match on Category
    category = alert.get("category", "").lower()
    if category in MITRE_MAPPING:
        alert["mitre"] = MITRE_MAPPING[category]
        return alert

    # 2. Try keyword match in Title or Description
    text_content = (alert.get("title", "") + " " + alert.get("description", "")).lower()
    
    # Simple keyword heuristics
    if "ssh" in text_content and ("fail" in text_content or "password" in text_content):
        alert["mitre"] = MITRE_MAPPING["authentication_failed"]
    elif "powershell" in text_content or "cmd.exe" in text_content:
        alert["mitre"] = MITRE_MAPPING["shell"]
    
    return alert

def normalize_wazuh_alert(alert: dict) -> dict:
    rule = alert.get("rule", {})
    agent = alert.get("agent", {})
    level_num = rule.get("level", 0)

    timestamp = alert.get("timestamp")
    if not timestamp:
        timestamp = datetime.now(timezone.utc).isoformat()

    normalized = {
        "id": str(uuid.uuid4()),
        "timestamp": timestamp,
        "source": "wazuh",
        "agent": {
            "name": agent.get("name", "Unknown"),
            "ip": agent.get("ip", "0.0.0.0")
        },
        "severity": level_num,
        "level": map_severity(level_num),
        "category": (rule.get("groups") or ["unknown"])[0],
        "title": rule.get("description", "Security Alert"),
        "description": alert.get("full_log", ""),
        "raw": alert
    }
    
    # Apply Enrichment
    return enrich_alert(normalized)

# =====================
# CORRELATION ENGINE
# =====================
class CorrelationManager:
    def __init__(self):
        self.history: List[tuple] = []
        self.cooldowns: Dict[str, float] = {}

    def process(self, alert: dict) -> Optional[dict]:
        if alert.get("source") == "correlation":
            return None

        now = datetime.now(timezone.utc).timestamp()
        
        ip = alert["agent"]["ip"]
        name = alert["agent"]["name"]
        
        self.history.append((now, ip, name))

        window_start = now - CORRELATION_WINDOW_SECONDS
        self.history = [evt for evt in self.history if evt[0] > window_start]

        return self._check_threshold(ip, "IP Address", now) or \
               self._check_threshold(name, "Agent Name", now)

    def _check_threshold(self, key: str, key_type: str, now: float) -> Optional[dict]:
        if key_type == "IP Address":
            count = sum(1 for evt in self.history if evt[1] == key)
        else:
            count = sum(1 for evt in self.history if evt[2] == key)

        if count >= CORRELATION_THRESHOLD:
            last_fired = self.cooldowns.get(key, 0)
            if now - last_fired < CORRELATION_WINDOW_SECONDS:
                return None

            self.cooldowns[key] = now
            
            # Construct Base Correlation Alert
            alert = {
                "id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "correlation",
                "agent": {
                    "name": "SIEM Engine",
                    "ip": "127.0.0.1"
                },
                "severity": 10,
                "level": "high",
                "category": "correlation",
                "title": f"Suspicious Activity Detected: {key_type}",
                "description": f"High volume of alerts ({count}) detected from {key_type} '{key}' within the last {CORRELATION_WINDOW_SECONDS} seconds.",
                "raw": {
                    "type": "threshold",
                    "correlation_key": key,
                    "count": count,
                    "window": CORRELATION_WINDOW_SECONDS
                }
            }
            
            # ✅ NEW: Explicitly enrich correlation alerts
            # We map 'correlation' category to T1562 (Impair Defenses) per requirement
            alert["mitre"] = MITRE_MAPPING["correlation"]
            
            return alert
        return None

correlation_engine = CorrelationManager()

# =====================
# WEBSOCKET & PIPELINE
# =====================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 Client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"❌ Client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Error broadcasting: {e}")

manager = ConnectionManager()
ALERTS: List[dict] = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        for alert in ALERTS:
            await websocket.send_json(alert)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def _emit_alert(alert: dict):
    global alert_counter
    await asyncio.to_thread(save_alert_sync, alert)
    alert_counter += 1
    if alert_counter % PRUNE_INTERVAL == 0:
        await asyncio.to_thread(prune_db_sync, RETENTION_LIMIT)

    ALERTS.append(alert)
    if len(ALERTS) > STARTUP_LOAD_LIMIT: 
        ALERTS.pop(0)

    await manager.broadcast(alert)

async def process_new_alert(normalized: dict):
    await _emit_alert(normalized)
    
    correlation_alert = correlation_engine.process(normalized)
    if correlation_alert:
        print(f"🚨 CORRELATION TRIGGERED: {correlation_alert['title']}")
        await _emit_alert(correlation_alert)

@app.post("/ingest")
async def ingest_alert(alert: dict):
    try:
        normalized = normalize_wazuh_alert(alert)
        print(f"📨 Received Alert via API: {normalized['title']}")
        await process_new_alert(normalized)
        return {"status": "processed", "id": normalized["id"]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def tail_alerts_file():
    if not os.path.exists(ALERTS_FILE):
        os.makedirs(os.path.dirname(ALERTS_FILE), exist_ok=True)
        with open(ALERTS_FILE, "w") as f: f.write("")

    print(f"📂 Watching file: {ALERTS_FILE}")
    try:
        with open(ALERTS_FILE, "r") as f:
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line:
                    await asyncio.sleep(0.5)
                    continue
                try:
                    raw_alert = json.loads(line)
                    normalized = normalize_wazuh_alert(raw_alert)
                    await process_new_alert(normalized)
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"❌ Error in file watcher: {e}")

@app.on_event("startup")
async def startup_event():
    await asyncio.to_thread(init_db)
    await asyncio.to_thread(prune_db_sync, RETENTION_LIMIT)
    
    global ALERTS
    ALERTS = await asyncio.to_thread(get_recent_alerts_sync, STARTUP_LOAD_LIMIT)
    print(f"✅ Loaded {len(ALERTS)} alerts from database history.")
    
    asyncio.create_task(tail_alerts_file())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9001)