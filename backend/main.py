from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime
import json
from typing import List

app = FastAPI(title="AlertStream Backend")

# 1. ALLOW FRONTEND CONNECTION (CORS Fix)
# This allows your React app on localhost:5173 to talk to this Python script
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (change to specific domain in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. WEBSOCKET MANAGER (The Broadcaster)
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"❌ Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        # Send data to all connected dashboards
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")

manager = ConnectionManager()
ALERTS = []

# 3. WEBSOCKET ENDPOINT (Frontend connects here)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send last 50 alerts immediately upon connection so dashboard isn't empty
        for alert in ALERTS[-50:]:
            await websocket.send_json(alert)
            
        # Keep connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# 4. INGEST ENDPOINT (Wazuh sends data here)
@app.post("/ingest")
async def ingest_alert(alert: dict):
    # Store in memory
    ALERTS.append(alert)
    
    # ✅ PRINT VALID JSON TO TERMINAL
    print(f"\n✅ ALERT RECEIVED @ {datetime.utcnow().isoformat()}")
    print(json.dumps(alert, indent=2)) # <--- This ensures strictly valid JSON output
    print("-" * 60)
    
    # ✨ Push to Frontend immediately
    await manager.broadcast(alert)
    
    return {"status": "broadcasted"}

# 5. HISTORY ENDPOINT (Optional, for page reload)
@app.get("/alerts")
def get_alerts():
    return ALERTS[-50:]

if __name__ == "__main__":
    print("🚀 SIEM Backend running on port 9001...")
    uvicorn.run(
        app,
        host="0.0.0.0",  # IMPORTANT: 0.0.0.0 allows external connections (like from WSL or Wazuh)
        port=9001
    )