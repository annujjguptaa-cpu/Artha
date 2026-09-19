import yaml
import os
from typing import List, Dict
from optimizer.schemas import OptimizationInputItem, OptimizationResult, WinnerItem

POLICY_PATH = os.path.join(os.path.dirname(__file__), "..", "policy", "policy_book.yaml")
PLATFORM_DELIVERY_FEE = 30.0

def load_policy(path: str = POLICY_PATH) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f).get("rules", {})

def optimize(items: List[OptimizationInputItem], policy_path: str = POLICY_PATH) -> OptimizationResult:
    policy = load_policy(policy_path)
    
    rating_threshold = policy.get("default_rating_threshold", 4.1)
    brand_lock_override = policy.get("brand_lock_override", True)
    delivery_fee_split_threshold = policy.get("delivery_fee_split_threshold", 50)
    confidence_flag_threshold = policy.get("confidence_flag_threshold", 0.75)
    
    needs_review = []
    winners = []
    
    platform_subtotals = {}
    
    # 1. Select the best product for each item
    for input_item in items:
        valid_results = []
        for result in input_item.worker_results:
            # Check confidence (scale is 0-100 in rapidfuzz, prompt says 0.75 threshold which usually means 75%)
            # I will assume confidence in WorkerResult is 0-100, so we scale threshold to 100
            if result.confidence < (confidence_flag_threshold * 100):
                continue
                
            # Filter by rating
            if input_item.requested_item.brand_lock and brand_lock_override:
                # bypass rating filter
                pass
            else:
                if result.rating is not None and result.rating < rating_threshold:
                    continue
                    
            if result.in_stock and result.status == "matched":
                valid_results.append(result)
                
        # If no valid results due to confidence, or they all were filtered out:
        if not valid_results:
            needs_review.append(input_item)
            continue
            
        # Pick cheapest survivor
        best_result = min(valid_results, key=lambda x: x.price)
        
        winners.append(WinnerItem(
            item_id=input_item.requested_item.item_id,
            name=best_result.matched_product,
            platform=best_result.platform,
            price=best_result.price,
            rating=best_result.rating,
            confidence=best_result.confidence
        ))
        
        # Accumulate subtotals for the "split-cart" baseline
        platform_subtotals[best_result.platform] = platform_subtotals.get(best_result.platform, 0) + best_result.price

    # 2. Compute cost strategies (Split vs Single Platform)
    # Strategy A: Split cart (current winners)
    num_platforms_used = len(set(w.platform for w in winners))
    split_cart_total = sum(platform_subtotals.values()) + (num_platforms_used * PLATFORM_DELIVERY_FEE)
    
    # Strategy B: Single platform
    # We find the single platform that has the cheapest valid result for ALL items.
    single_platform_totals = {}
    
    # Get all unique platforms seen
    all_platforms = set()
    for input_item in items:
        for res in input_item.worker_results:
            all_platforms.add(res.platform)
            
    best_single_platform = None
    best_single_total = float('inf')
    
    for platform in all_platforms:
        platform_valid = True
        total = PLATFORM_DELIVERY_FEE
        
        for input_item in items:
            if input_item in needs_review:
                continue # Skip items that are already in needs_review universally
                
            # find best valid result on THIS platform
            valid_platform_results = []
            for result in input_item.worker_results:
                if result.platform != platform: continue
                if result.confidence < (confidence_flag_threshold * 100): continue
                if not (input_item.requested_item.brand_lock and brand_lock_override):
                    if result.rating is not None and result.rating < rating_threshold:
                        continue
                if result.in_stock and result.status == "matched":
                    valid_platform_results.append(result)
                    
            if not valid_platform_results:
                platform_valid = False
                break
                
            best = min(valid_platform_results, key=lambda x: x.price)
            total += best.price
            
        if platform_valid and total < best_single_total:
            best_single_total = total
            best_single_platform = platform

    # Apply threshold rule
    split_cart_used = False
    savings = 0.0
    final_total = best_single_total
    final_platform_totals = {best_single_platform: best_single_total} if best_single_platform else {}

    # If single platform is valid, compare savings
    if best_single_platform is not None:
        savings = best_single_total - split_cart_total
        if savings > delivery_fee_split_threshold:
            # Savings exceed threshold -> use split cart
            split_cart_used = True
            final_total = split_cart_total
            final_platform_totals = platform_subtotals
        else:
            # Override winners to all be from the best_single_platform
            split_cart_used = False
            savings = 0.0
            winners = []
            final_platform_totals = {best_single_platform: best_single_total}
            
            for input_item in items:
                if input_item in needs_review: continue
                
                # find best valid result on best_single_platform
                valid_platform_results = []
                for result in input_item.worker_results:
                    if result.platform != best_single_platform: continue
                    if result.confidence < (confidence_flag_threshold * 100): continue
                    if not (input_item.requested_item.brand_lock and brand_lock_override):
                        if result.rating is not None and result.rating < rating_threshold:
                            continue
                    if result.in_stock and result.status == "matched":
                        valid_platform_results.append(result)
                        
                if valid_platform_results:
                    best = min(valid_platform_results, key=lambda x: x.price)
                    winners.append(WinnerItem(
                        item_id=input_item.requested_item.item_id,
                        name=best.matched_product,
                        platform=best.platform,
                        price=best.price,
                        rating=best.rating,
                        confidence=best.confidence
                    ))
    else:
        # No single platform can fulfill the order, forced split
        split_cart_used = True
        final_total = split_cart_total
        final_platform_totals = platform_subtotals

    return OptimizationResult(
        winners=winners,
        needs_review=needs_review,
        platform_totals=final_platform_totals,
        total_cost=final_total,
        split_cart_used=split_cart_used,
        savings=savings
    )
