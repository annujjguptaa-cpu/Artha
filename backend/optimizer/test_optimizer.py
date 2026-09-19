import pytest
import os
import yaml
from optimizer.schemas import OptimizationInputItem
from agents.schemas import WorkerResult
from schemas import ShoppingItemSchema
from optimizer.optimizer import optimize

TEST_POLICY_PATH = "/tmp/test_policy_book.yaml"

@pytest.fixture(autouse=True)
def setup_policy():
    policy = {
        "rules": {
            "default_rating_threshold": 4.1,
            "brand_lock_override": True,
            "delivery_fee_split_threshold": 50,
            "confidence_flag_threshold": 0.75,
        }
    }
    with open(TEST_POLICY_PATH, "w") as f:
        yaml.dump(policy, f)
    yield
    if os.path.exists(TEST_POLICY_PATH):
        os.remove(TEST_POLICY_PATH)

def test_brand_lock_override():
    # Setup an item that is brand-locked, and its matches have low rating (e.g. 3.5)
    req_item = ShoppingItemSchema(item_id="1", name="Amul Butter", brand_lock=True, brand="Amul")
    wr1 = WorkerResult(item_id="1", platform="zepto", matched_product="Amul Butter", price=50, unit_price=50, rating=3.5, in_stock=True, confidence=100.0, status="matched")
    
    input_item = OptimizationInputItem(requested_item=req_item, worker_results=[wr1])
    
    res = optimize([input_item], policy_path=TEST_POLICY_PATH)
    assert len(res.winners) == 1
    assert res.winners[0].platform == "zepto"
    
def test_rating_filter():
    # Setup an item that is generic, matches have low rating
    req_item = ShoppingItemSchema(item_id="1", name="Tomatoes", brand_lock=False)
    wr1 = WorkerResult(item_id="1", platform="zepto", matched_product="Tomatoes", price=50, unit_price=50, rating=3.5, in_stock=True, confidence=100.0, status="matched")
    
    input_item = OptimizationInputItem(requested_item=req_item, worker_results=[wr1])
    
    res = optimize([input_item], policy_path=TEST_POLICY_PATH)
    # Should be filtered out due to rating < 4.1, going to needs_review
    assert len(res.winners) == 0
    assert len(res.needs_review) == 1

def test_low_confidence():
    # Setup an item with low confidence
    req_item = ShoppingItemSchema(item_id="1", name="Weird Item", brand_lock=False)
    # confidence is 70, threshold is 75
    wr1 = WorkerResult(item_id="1", platform="zepto", matched_product="Weird Item", price=50, unit_price=50, rating=4.5, in_stock=True, confidence=70.0, status="matched")
    
    input_item = OptimizationInputItem(requested_item=req_item, worker_results=[wr1])
    
    res = optimize([input_item], policy_path=TEST_POLICY_PATH)
    assert len(res.winners) == 0
    assert len(res.needs_review) == 1

def test_split_vs_single():
    # Items: A, B. 
    # Zepto has A for 100, B for 100. Total = 200 + 30 fee = 230
    # Blinkit has A for 50. Instamart has B for 50. Split total = 50+50 + 60 fee = 160
    # Savings of split = 230 - 160 = 70. Since 70 > 50 (threshold), split should trigger.
    
    req_item1 = ShoppingItemSchema(item_id="1", name="A", brand_lock=False)
    wr1_zepto = WorkerResult(item_id="1", platform="zepto", matched_product="A", price=100, unit_price=100, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    wr1_blinkit = WorkerResult(item_id="1", platform="blinkit", matched_product="A", price=50, unit_price=50, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    
    req_item2 = ShoppingItemSchema(item_id="2", name="B", brand_lock=False)
    wr2_zepto = WorkerResult(item_id="2", platform="zepto", matched_product="B", price=100, unit_price=100, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    wr2_instamart = WorkerResult(item_id="2", platform="instamart", matched_product="B", price=50, unit_price=50, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    
    items = [
        OptimizationInputItem(requested_item=req_item1, worker_results=[wr1_zepto, wr1_blinkit]),
        OptimizationInputItem(requested_item=req_item2, worker_results=[wr2_zepto, wr2_instamart])
    ]
    
    res = optimize(items, policy_path=TEST_POLICY_PATH)
    assert res.split_cart_used is True
    assert res.savings == 70.0

def test_split_vs_single_no_trigger():
    # If Blinkit A is 90 and Instamart B is 90, Split total = 180 + 60 = 240
    # Zepto is 100+100 + 30 = 230. Single platform is cheaper!
    req_item1 = ShoppingItemSchema(item_id="1", name="A", brand_lock=False)
    wr1_zepto = WorkerResult(item_id="1", platform="zepto", matched_product="A", price=100, unit_price=100, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    wr1_blinkit = WorkerResult(item_id="1", platform="blinkit", matched_product="A", price=90, unit_price=90, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    
    req_item2 = ShoppingItemSchema(item_id="2", name="B", brand_lock=False)
    wr2_zepto = WorkerResult(item_id="2", platform="zepto", matched_product="B", price=100, unit_price=100, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    wr2_instamart = WorkerResult(item_id="2", platform="instamart", matched_product="B", price=90, unit_price=90, rating=4.5, in_stock=True, confidence=100.0, status="matched")
    
    items = [
        OptimizationInputItem(requested_item=req_item1, worker_results=[wr1_zepto, wr1_blinkit]),
        OptimizationInputItem(requested_item=req_item2, worker_results=[wr2_zepto, wr2_instamart])
    ]
    
    res = optimize(items, policy_path=TEST_POLICY_PATH)
    assert res.split_cart_used is False
    assert len(res.winners) == 2
    assert res.winners[0].platform == "zepto"
    assert res.winners[1].platform == "zepto"

def test_hot_reload():
    req_item = ShoppingItemSchema(item_id="1", name="Tomatoes", brand_lock=False)
    wr1 = WorkerResult(item_id="1", platform="zepto", matched_product="Tomatoes", price=50, unit_price=50, rating=3.5, in_stock=True, confidence=100.0, status="matched")
    input_item = OptimizationInputItem(requested_item=req_item, worker_results=[wr1])
    
    # initially filtered out due to 3.5 < 4.1
    res1 = optimize([input_item], policy_path=TEST_POLICY_PATH)
    assert len(res1.winners) == 0
    
    # Change policy mid-flight to allow 3.0 rating
    policy = {
        "rules": {
            "default_rating_threshold": 3.0,
            "brand_lock_override": True,
            "delivery_fee_split_threshold": 50,
            "confidence_flag_threshold": 0.75,
        }
    }
    with open(TEST_POLICY_PATH, "w") as f:
        yaml.dump(policy, f)
        
    res2 = optimize([input_item], policy_path=TEST_POLICY_PATH)
    assert len(res2.winners) == 1  # Should pass now without restarting!
