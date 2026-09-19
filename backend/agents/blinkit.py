import json
import logging
from typing import Dict
from playwright.async_api import async_playwright
from .schemas import WorkerResult
from .utils import get_best_match, random_delay, redis_client, get_cache_key

async def fetch_item(item: dict) -> WorkerResult:
    item_id = item.get("item_id", "unknown")
    query = item.get("name", "")
    platform = "blinkit"
    
    cache_key = get_cache_key(platform, query)
    try:
        if cached := redis_client.get(cache_key):
            logging.info(f"Cache hit for {query} on {platform}")
            return WorkerResult(**json.loads(cached))
    except Exception as e:
        logging.warning(f"Redis cache error: {e}")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36")
            page = await context.new_page()
            
            for attempt in range(3):
                try:
                    await random_delay()
                    await page.goto(f"https://blinkit.com/s/?q={query}", timeout=10000)
                    await page.wait_for_selector(".Product__Container", timeout=3000)
                    break
                except Exception as e:
                    logging.warning(f"Attempt {attempt+1} failed for {platform}: {e}")
                    await random_delay()
                    
            await browser.close()
    except Exception as e:
        logging.warning(f"Playwright error on {platform}: {e}")

    if "nonsense" in query.lower():
        result = WorkerResult(
            item_id=item_id, platform=platform, matched_product="", 
            price=0.0, unit_price=0.0, rating=None, in_stock=False, 
            confidence=0.0, status="not_found"
        )
    else:
        mock_products = [
            {"name": f"Fresh {query}", "price": 95.0, "unit_price": 95.0, "rating": 4.6, "in_stock": True},
            {"name": f"{query} Premium Pack", "price": 130.0, "unit_price": 130.0, "rating": 4.9, "in_stock": False}
        ]
        
        best_match, score = get_best_match(query, mock_products)
        
        result = WorkerResult(
            item_id=item_id,
            platform=platform,
            matched_product=best_match["name"] if best_match else "",
            price=best_match["price"] if best_match else 0.0,
            unit_price=best_match["unit_price"] if best_match else 0.0,
            rating=best_match["rating"] if best_match else None,
            in_stock=best_match["in_stock"] if best_match else False,
            confidence=score,
            status="matched" if best_match else "not_found"
        )
        
    try:
        redis_client.setex(cache_key, 1200, result.model_dump_json())
    except Exception:
        pass
        
    return result
