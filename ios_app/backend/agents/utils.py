import random
import asyncio
import redis
from rapidfuzz import fuzz
from typing import List, Dict, Tuple, Optional
from playwright.async_api import async_playwright, Page, BrowserContext

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def compute_confidence(query: str, product_name: str) -> float:
    """Computes a fuzzy match confidence score between 0 and 100."""
    return fuzz.token_set_ratio(query.lower(), product_name.lower())

def get_best_match(query: str, products: List[Dict]) -> Tuple[Optional[Dict], float]:
    """Returns the highest confidence product and its score."""
    best_match = None
    best_score = 0.0
    for p in products:
        score = compute_confidence(query, p.get("name", ""))
        if score > best_score:
            best_score = score
            best_match = p
    return best_match, best_score

async def random_delay():
    """Randomized delay between 800-2200ms to avoid bot detection."""
    delay = random.uniform(0.8, 2.2)
    await asyncio.sleep(delay)

def get_cache_key(platform: str, item_name: str) -> str:
    return f"scraper_cache:{platform}:{item_name}"
