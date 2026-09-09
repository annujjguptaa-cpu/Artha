from pydantic import BaseModel
from typing import List, Optional, Dict
from agents.schemas import WorkerResult
from schemas import ShoppingItemSchema

class OptimizationInputItem(BaseModel):
    requested_item: ShoppingItemSchema
    worker_results: List[WorkerResult]

class WinnerItem(BaseModel):
    item_id: str
    name: str
    platform: str
    price: float
    rating: Optional[float]
    confidence: float

class OptimizationResult(BaseModel):
    winners: List[WinnerItem]
    needs_review: List[OptimizationInputItem]
    platform_totals: Dict[str, float]
    total_cost: float
    split_cart_used: bool
    savings: float
