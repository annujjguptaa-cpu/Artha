import asyncio
import time
from agents import zepto, blinkit, instamart
from agents.utils import redis_client

async def test_all_agents():
    # Clear cache before starting to ensure a fresh test
    redis_client.flushdb()
    
    sample_items = [
        {"item_id": "1", "name": "Tata Salt"},
        {"item_id": "2", "name": "Amul Butter"},
        {"item_id": "3", "name": "Fresh Tomatoes"},
        {"item_id": "4", "name": "Maggi Noodles"},
        {"item_id": "5", "name": "complete nonsense item 12345xyz"} # Deliberately malformed for failure path
    ]
    
    platforms = {
        "Zepto": zepto.fetch_item,
        "Blinkit": blinkit.fetch_item,
        "Instamart": instamart.fetch_item
    }

    print("=" * 80)
    print(f"{'Item Name':<30} | {'Platform':<10} | {'Status':<10} | {'Confidence':<10} | {'Matched Product'}")
    print("=" * 80)

    # First pass
    start_time = time.time()
    results = []
    
    # We will test sequentially to avoid triggering massive rate limits all at once
    for item in sample_items:
        for name, func in platforms.items():
            res = await func(item)
            results.append((item['name'], name, res))
            print(f"{item['name']:<30} | {name:<10} | {res.status:<10} | {res.confidence:<10.2f} | {res.matched_product}")
            
    print("-" * 80)
    print(f"First pass completed in {time.time() - start_time:.2f} seconds.")
    print("-" * 80)
    
    # Second pass to test cache
    start_time_cache = time.time()
    for item in sample_items:
        for name, func in platforms.items():
            res = await func(item)
            
    print(f"Second pass (cache hit) completed in {time.time() - start_time_cache:.2f} seconds.")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_all_agents())
