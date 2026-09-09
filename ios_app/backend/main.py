from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, services
from database import engine, get_db

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Grocery Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Agentic Backend Running"}

@app.post("/parse-list", response_model=schemas.ShoppingListResponse)
def parse_list(request: schemas.ParseListRequest, db: Session = Depends(get_db)):
    parsed_response = services.parse_grocery_list(request.raw_text)
    
    # Save to db
    db_list = models.ShoppingList(
        list_id=parsed_response.list_id,
        raw_text=request.raw_text,
        needs_clarification=parsed_response.needs_clarification
    )
    db.add(db_list)
    
    for item in parsed_response.items:
        db_item = models.ShoppingItem(
            item_id=item.item_id,
            list_id=parsed_response.list_id,
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            brand_lock=item.brand_lock,
            brand=item.brand
        )
        db.add(db_item)
        
    db.commit()
    return parsed_response

@app.get("/list/{list_id}", response_model=schemas.ShoppingListResponse)
def get_list(list_id: str, db: Session = Depends(get_db)):
    db_list = db.query(models.ShoppingList).filter(models.ShoppingList.list_id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    items = []
    for db_item in db_list.items:
        items.append(schemas.ShoppingItemSchema(
            item_id=db_item.item_id,
            name=db_item.name,
            quantity=db_item.quantity,
            unit=db_item.unit,
            brand_lock=db_item.brand_lock,
            brand=db_item.brand
        ))
        
    return schemas.ShoppingListResponse(
        list_id=db_list.list_id,
        items=items,
        needs_clarification=db_list.needs_clarification
    )

from orchestrator import router as orchestrator_router
app.include_router(orchestrator_router)
