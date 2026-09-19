import os
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from agents import zepto, blinkit, instamart
from agents.schemas import WorkerResult
from optimizer.schemas import OptimizationInputItem, OptimizationResult
from optimizer.optimizer import optimize
from orchestrator_state import manager, progress_state

router = APIRouter()

async def run_agent(agent_func, item_dict, platform_name):
    try:
        return await asyncio.wait_for(agent_func(item_dict), timeout=25.0)
    except Exception as e:
        # Fallback if agent crashes or times out
        return WorkerResult(
            item_id=item_dict.get("item_id", ""),
            platform=platform_name,
            matched_product="",
            price=0.0,
            unit_price=0.0,
            rating=None,
            in_stock=False,
            confidence=0.0,
            status="platform_unavailable"
        )

@router.post("/compare/{list_id}", response_model=OptimizationResult)
async def compare_list(list_id: str, db: Session = Depends(get_db)):
    db_list = db.query(models.ShoppingList).filter(models.ShoppingList.list_id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    items = db_list.items
    total_items = len(items)
    
    # Initialize state
    progress_state[list_id] = {
        "percent_complete": 0,
        "completed_items": 0,
        "total_items": total_items,
        "platforms_done": []
    }
    
    platforms = [
        ("zepto", zepto.fetch_item),
        ("blinkit", blinkit.fetch_item),
        ("instamart", instamart.fetch_item)
    ]
    
    optimization_inputs = []
    
    for db_item in items:
        item_dict = {
            "item_id": db_item.item_id,
            "name": db_item.name,
            "brand_lock": db_item.brand_lock
        }
        
        req_item = schemas.ShoppingItemSchema(
            item_id=db_item.item_id,
            name=db_item.name,
            quantity=db_item.quantity,
            unit=db_item.unit,
            brand_lock=db_item.brand_lock,
            brand=db_item.brand
        )
        
        worker_results = []
        if os.getenv("DEMO_MODE") == "1":
            for name, _ in platforms:
                mock_found = False
                try:
                    from agents.utils import redis_client, get_cache_key
                    key = get_cache_key(name, db_item.name.lower())
                    cached = redis_client.get(key)
                    if cached:
                        worker_results.append(WorkerResult(**json.loads(cached)))
                        mock_found = True
                except Exception as e:
                    pass
                
                if not mock_found:
                    # Realistic fallback mock price per platform
                    base_price = 45.0 + (hash(db_item.name) % 80)
                    price_mult = {"zepto": 0.95, "blinkit": 0.90, "instamart": 1.05}.get(name, 1.0)
                    item_price = round(base_price * price_mult, 2)
                    worker_results.append(WorkerResult(
                        item_id=db_item.item_id,
                        platform=name,
                        matched_product=f"{db_item.name} ({name.capitalize()} Pack)",
                        price=item_price,
                        unit_price=item_price,
                        rating=4.6 if name == "zepto" else 4.4,
                        in_stock=True,
                        confidence=0.92,
                        status="matched"
                    ))
            await asyncio.sleep(0.3) # Fast realistic demo delay

        else:
            tasks = [run_agent(func, item_dict, name) for name, func in platforms]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for res in results:
                if isinstance(res, WorkerResult):
                    worker_results.append(res)
                    
        optimization_inputs.append(OptimizationInputItem(
            requested_item=req_item,
            worker_results=worker_results
        ))
        
        # Update progress
        state = progress_state[list_id]
        state["completed_items"] += 1
        state["percent_complete"] = int((state["completed_items"] / state["total_items"]) * 100)
        
        # In a real app we'd track platform completion specifically, but here we just append all for simplicity
        if state["completed_items"] == state["total_items"]:
            state["platforms_done"] = ["zepto", "blinkit", "instamart"]
            
        await manager.broadcast(list_id, state)
        
    # Run optimizer
    opt_result = optimize(optimization_inputs)
    
    # Save to db
    db_comp = models.ComparisonResult(
        list_id=list_id,
        optimization_data=opt_result.model_dump_json()
    )
    db.add(db_comp)
    db.commit()
    
    return opt_result

@router.get("/compare/{list_id}/status", response_model=schemas.ProgressUpdate)
def get_compare_status(list_id: str):
    if list_id not in progress_state:
        raise HTTPException(status_code=404, detail="No active comparison found for this list_id")
    state = progress_state[list_id]
    return schemas.ProgressUpdate(list_id=list_id, **state)

@router.websocket("/ws/compare/{list_id}")
async def websocket_endpoint(websocket: WebSocket, list_id: str):
    await manager.connect(list_id, websocket)
    try:
        while True:
            # Keep connection open, client just listens
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(list_id, websocket)
