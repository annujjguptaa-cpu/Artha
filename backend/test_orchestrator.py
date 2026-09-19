import pytest
import asyncio
import time
from httpx import AsyncClient, ASGITransport
from main import app
from database import Base, engine
from sqlalchemy.orm import sessionmaker
from models import ShoppingList, ShoppingItem, ComparisonResult

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
import orchestrator

# Ensure DB is created for tests
Base.metadata.create_all(bind=engine)

import pytest_asyncio

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest.fixture(autouse=True)
def cleanup_db():
    # Setup
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # We populate a ShoppingList with 10 items
    db = TestingSessionLocal()
    list_id = "test_list_123"
    db_list = ShoppingList(list_id=list_id, raw_text="10 items")
    db.add(db_list)
    
    for i in range(10):
        db_item = ShoppingItem(
            item_id=f"item_{i}",
            list_id=list_id,
            name=f"MockItem {i}",
            brand_lock=False
        )
        db.add(db_item)
    db.commit()
    db.close()
    
    yield
    
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_full_orchestration_cycle(async_client):
    list_id = "test_list_123"
    
    start_time = time.time()
    
    # We do a POST which should run everything
    response = await async_client.post(f"/compare/{list_id}")
    assert response.status_code == 200
    
    duration = time.time() - start_time
    assert duration < 30.0, f"Execution took {duration}s, which is > 30s limit"
    
    data = response.json()
    assert "winners" in data
    
    # Verify DB insertion
    db = TestingSessionLocal()
    comp_row = db.query(ComparisonResult).filter(ComparisonResult.list_id == list_id).first()
    assert comp_row is not None
    db.close()

@pytest.mark.asyncio
async def test_partial_failure(async_client, monkeypatch):
    list_id = "test_list_123"
    
    # Mock one agent to raise Exception
    async def failing_agent(item_dict):
        raise Exception("Simulated crash")
        
    import agents.zepto
    monkeypatch.setattr(agents.zepto, "fetch_item", failing_agent)
    
    # Override platforms list in orchestrator
    from agents import blinkit, instamart
    original_platforms = [
        ("zepto", failing_agent),
        ("blinkit", blinkit.fetch_item),
        ("instamart", instamart.fetch_item)
    ]
    
    response = await async_client.post(f"/compare/{list_id}")
    assert response.status_code == 200
    
    # Because Zepto failed, we should see zepto's items processed correctly inside logic (bypassed)
    # The response should still return a full OptimizationResult.
    data = response.json()
    assert "winners" in data or "needs_review" in data
    
@pytest.mark.asyncio
async def test_status_endpoint(async_client):
    # Just checking it 404s if not running
    response = await async_client.get(f"/compare/invalid_id/status")
    assert response.status_code == 404
