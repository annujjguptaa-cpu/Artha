import os
import json
import uuid
import anthropic
from schemas import ShoppingListResponse

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", "dummy_key"))

def parse_grocery_list(raw_text: str) -> ShoppingListResponse:
    prompt = f"""
    You are an expert grocery list parser. The user has provided a raw text grocery list:
    "{raw_text}"
    
    Extract the items into a structured JSON format with the following schema:
    {{
      "items": [
        {{
          "item_id": "a unique string like a UUID",
          "name": "the generic name of the item",
          "quantity": "the quantity number as string (e.g. '2', '500')",
          "unit": "the unit of measurement (e.g. 'kg', 'g', 'pack')",
          "brand_lock": true/false (true if a brand is specified),
          "brand": "the brand name if brand_lock is true, else null"
        }}
      ],
      "needs_clarification": true/false (true if the input is heavily malformed or ambiguous),
      "clarification_details": [
        {{
          "item_text": "the ambiguous part",
          "issue": "description of ambiguity"
        }}
      ] // Include only if needs_clarification is true
    }}

    IMPORTANT: 
    - Output ONLY valid JSON matching this schema. No markdown, no prose, no backticks.
    - Generate a unique string for each item_id.
    """
    
    # In a real app we'd use async, but this is a synchronous wrapper for simplicity 
    # unless we use AsyncAnthropic. We will use the sync client here.
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        content = response.content[0].text
        # Clean up any potential markdown block
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        data = json.loads(content)
        data["list_id"] = str(uuid.uuid4())
        return ShoppingListResponse(**data)
    except Exception as e:
        # Fallback for completely malformed
        return ShoppingListResponse(
            list_id=str(uuid.uuid4()),
            items=[],
            needs_clarification=True,
            clarification_details=[{"item_text": raw_text, "issue": f"Failed to parse or call API: {str(e)}"}]
        )
