from pydantic import BaseModel
from typing import Optional, Literal

class WorkerResult(BaseModel):
    item_id: str
    platform: str
    matched_product: str
    price: float
    unit_price: float
    rating: Optional[float]
    in_stock: bool
    confidence: float
    status: Literal["matched", "not_found", "platform_unavailable"]
