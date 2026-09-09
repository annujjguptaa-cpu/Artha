from pydantic import BaseModel, Field
from typing import List, Optional

class ShoppingItemSchema(BaseModel):
    item_id: str = Field(..., description="A unique string ID for the item")
    name: str = Field(..., description="The name of the item (generic if brand is specified separately)")
    quantity: Optional[str] = Field(None, description="The quantity (e.g. '2', '500')")
    unit: Optional[str] = Field(None, description="The unit of measurement (e.g. 'kg', 'g', 'pack')")
    brand_lock: bool = Field(False, description="True if a specific brand was requested")
    brand: Optional[str] = Field(None, description="The requested brand name, if any")

class ParseListRequest(BaseModel):
    raw_text: str

class ClarificationDetail(BaseModel):
    item_text: str
    issue: str

class ShoppingListResponse(BaseModel):
    list_id: str
    items: List[ShoppingItemSchema]
    needs_clarification: bool = False
    clarification_details: Optional[List[ClarificationDetail]] = None

class ProgressUpdate(BaseModel):
    list_id: str
    percent_complete: int
    completed_items: int
    total_items: int
    platforms_done: List[str]
