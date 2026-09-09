import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app
from database import Base, engine, SessionLocal
from schemas import ShoppingListResponse, ShoppingItemSchema, ClarificationDetail
import uuid

# Recreate the tables in the test db
Base.metadata.create_all(bind=engine)

client = TestClient(app)

# Mocked responses for our 5 test cases
def mock_claude_response(raw_text: str):
    list_id = str(uuid.uuid4())
    if "2kg tomatoes, Amul butter 500g" in raw_text:
        return ShoppingListResponse(
            list_id=list_id,
            items=[
                ShoppingItemSchema(item_id="1", name="tomatoes", quantity="2", unit="kg", brand_lock=False, brand=None),
                ShoppingItemSchema(item_id="2", name="butter", quantity="500", unit="g", brand_lock=True, brand="Amul")
            ],
            needs_clarification=False
        )
    elif "\n" in raw_text and "milk" in raw_text:
        return ShoppingListResponse(
            list_id=list_id,
            items=[
                ShoppingItemSchema(item_id="3", name="milk", quantity="1", unit="L", brand_lock=False, brand=None),
                ShoppingItemSchema(item_id="4", name="salt", quantity="1", unit="kg", brand_lock=True, brand="Tata")
            ],
            needs_clarification=False
        )
    elif "Maggi noodles, generic eggs" in raw_text:
        return ShoppingListResponse(
            list_id=list_id,
            items=[
                ShoppingItemSchema(item_id="5", name="noodles", quantity=None, unit=None, brand_lock=True, brand="Maggi"),
                ShoppingItemSchema(item_id="6", name="eggs", quantity=None, unit=None, brand_lock=False, brand=None)
            ],
            needs_clarification=False
        )
    elif "some weird stuff jkfdsf" in raw_text:
        return ShoppingListResponse(
            list_id=list_id,
            items=[],
            needs_clarification=True,
            clarification_details=[ClarificationDetail(item_text="weird stuff jkfdsf", issue="Could not extract items")]
        )
    else:
        # Fallback general list
        return ShoppingListResponse(
            list_id=list_id,
            items=[ShoppingItemSchema(item_id="7", name="apples", quantity="5", unit="pcs", brand_lock=False, brand=None)],
            needs_clarification=False
        )

@pytest.fixture
def mock_parser():
    with patch("main.services.parse_grocery_list", side_effect=mock_claude_response) as mock:
        yield mock

def test_parse_comma_list(mock_parser):
    response = client.post("/parse-list", json={"raw_text": "2kg tomatoes, Amul butter 500g"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["items"][1]["brand_lock"] is True
    assert data["items"][1]["brand"] == "Amul"
    assert "list_id" in data

    # Test persistence
    list_id = data["list_id"]
    get_response = client.get(f"/list/{list_id}")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert len(get_data["items"]) == 2

def test_parse_newline_list(mock_parser):
    response = client.post("/parse-list", json={"raw_text": "milk 1L\nTata salt 1kg"})
    assert response.status_code == 200
    data = response.json()
    assert data["items"][1]["brand_lock"] is True
    assert data["items"][1]["brand"] == "Tata"

def test_parse_mixed_brand_generic(mock_parser):
    response = client.post("/parse-list", json={"raw_text": "Maggi noodles, generic eggs"})
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["brand_lock"] is True
    assert data["items"][0]["brand"] == "Maggi"
    assert data["items"][1]["brand_lock"] is False

def test_malformed_input(mock_parser):
    response = client.post("/parse-list", json={"raw_text": "some weird stuff jkfdsf"})
    assert response.status_code == 200
    data = response.json()
    assert data["needs_clarification"] is True
    assert len(data["items"]) == 0
    assert data["clarification_details"][0]["issue"] == "Could not extract items"

def test_basic_list_fallback(mock_parser):
    response = client.post("/parse-list", json={"raw_text": "just 5 apples"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "apples"
