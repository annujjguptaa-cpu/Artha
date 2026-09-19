import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    list_id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    raw_text = Column(Text, nullable=False)
    needs_clarification = Column(Boolean, default=False)
    
    items = relationship("ShoppingItem", back_populates="shopping_list", cascade="all, delete-orphan")

class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    item_id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    list_id = Column(String, ForeignKey("shopping_lists.list_id"))
    name = Column(String, nullable=False)
    quantity = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    brand_lock = Column(Boolean, default=False)
    brand = Column(String, nullable=True)

    shopping_list = relationship("ShoppingList", back_populates="items")

class ComparisonResult(Base):
    __tablename__ = "comparison_results"
    
    result_id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    list_id = Column(String, ForeignKey("shopping_lists.list_id"), unique=True)
    optimization_data = Column(Text, nullable=False) # JSON data
