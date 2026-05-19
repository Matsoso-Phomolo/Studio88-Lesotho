from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class StoreCreate(BaseModel):
    name: str
    location: str
    manager_name: Optional[str] = None
    contact_phone: Optional[str] = None


class StoreRead(StoreCreate):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    brand: str
    color: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    is_new: bool = False


class ProductRead(ProductCreate):
    id: int

    class Config:
        from_attributes = True


class StockCreate(BaseModel):
    store_id: int
    product_id: int
    quantity: int


class StockRead(BaseModel):
    id: int
    store_id: int
    product_id: int
    quantity: int
    status: str

    class Config:
        from_attributes = True


class PromotionCreate(BaseModel):
    store_id: int
    product_id: int
    discount_percent: float
    start_date: date
    end_date: date
    title: Optional[str] = None


class PromotionRead(PromotionCreate):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str
    store_id: Optional[int] = None


class UserRead(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    store_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    store_id: Optional[int] = None


class OrderItemCreate(BaseModel):
    product_id: int
    product_name: str
    size_label: Optional[str] = None
    colour_name: Optional[str] = None
    quantity: int
    unit_price: float


class OrderCreate(BaseModel):
    customer_full_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_place: Optional[str] = None
    customer_district: Optional[str] = None
    store_id: int
    payment_method: str
    payment_phone: Optional[str] = None
    items: List[OrderItemCreate]


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    size_label: Optional[str]
    colour_name: Optional[str]
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    order_number: str
    customer_full_name: str
    customer_phone: str
    customer_email: Optional[str]
    customer_place: Optional[str]
    customer_district: Optional[str]
    store_id: int
    status: str
    total_amount: float
    created_at: datetime
    items: List[OrderItemRead] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str


class PaymentConfirm(BaseModel):
    order_id: int
    payment_method: str
    payment_phone: Optional[str] = None


class StripeCheckoutSessionCreate(BaseModel):
    order_id: int


class StripeCheckoutSessionRead(BaseModel):
    checkout_url: str
    session_id: str
    payment_status: str


class WarrantyCreate(BaseModel):
    order_id: int
    customer_full_name: str
    customer_phone: str
    reason: str


class WarrantyRead(WarrantyCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class WarrantyStatusUpdate(BaseModel):
    status: str
