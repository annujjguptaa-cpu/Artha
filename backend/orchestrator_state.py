from typing import Dict, List
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
    async def connect(self, list_id: str, websocket: WebSocket):
        await websocket.accept()
        if list_id not in self.active_connections:
            self.active_connections[list_id] = []
        self.active_connections[list_id].append(websocket)
        
    def disconnect(self, list_id: str, websocket: WebSocket):
        if list_id in self.active_connections:
            self.active_connections[list_id].remove(websocket)
            if not self.active_connections[list_id]:
                del self.active_connections[list_id]
                
    async def broadcast(self, list_id: str, message: dict):
        if list_id in self.active_connections:
            for connection in self.active_connections[list_id]:
                await connection.send_json(message)

manager = WebSocketManager()

# Global memory state for polling
progress_state: Dict[str, dict] = {}
