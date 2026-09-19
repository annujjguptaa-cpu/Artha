import json
import uuid
from database import SessionLocal, Base, engine
from models import ShoppingList, ShoppingItem
from agents.utils import redis_client, get_cache_key
import agents.schemas as schemas

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clean previous if any
    db.query(ShoppingItem).delete()
    db.query(ShoppingList).delete()
    
    demo_list_id = "demo_list_weekend"
    
    list_obj = ShoppingList(
        list_id=demo_list_id,
        raw_text="2kg tomatoes, 1kg onion, Amul Butter 500g, 1L Milk, 500g Paneer",
        needs_clarification=False
    )
    db.add(list_obj)
    
    items = [
        {"id": "item_1", "name": "Tomatoes", "qty": "2", "unit": "kg", "brand": None, "brand_lock": False},
        {"id": "item_2", "name": "Onion", "qty": "1", "unit": "kg", "brand": None, "brand_lock": False},
        {"id": "item_3", "name": "Amul Butter", "qty": "500", "unit": "g", "brand": "Amul", "brand_lock": True},
        {"id": "item_4", "name": "Milk", "qty": "1", "unit": "L", "brand": None, "brand_lock": False},
        {"id": "item_5", "name": "Paneer", "qty": "500", "unit": "g", "brand": None, "brand_lock": False},
    ]
    
    for it in items:
        db.add(ShoppingItem(
            item_id=it["id"],
            list_id=demo_list_id,
            name=it["name"],
            quantity=it["qty"],
            unit=it["unit"],
            brand=it["brand"],
            brand_lock=it["brand_lock"]
        ))
        
        # Seed realistic redis mock responses for demo
        for platform in ["zepto", "blinkit", "instamart"]:
            base_price = 50.0 if "Tomatoes" in it["name"] else 40.0
            if platform == "zepto": base_price *= 0.95
            
            mock_res = schemas.WorkerResult(
                item_id=it["id"],
                platform=platform,
                matched_product=f"{it['name']} Fresh",
                price=round(base_price, 2),
                unit_price=round(base_price, 2),
                rating=4.5,
                in_stock=True,
                confidence=0.9,
                status="matched"
            )
            
            cache_key = get_cache_key(platform, it['name'].lower())
            redis_client.set(cache_key, mock_res.model_dump_json(), ex=3600)
            
    db.commit()
    db.close()
    
    print(f"Successfully seeded demo data. List ID: {demo_list_id}")

if __name__ == "__main__":
    seed()
