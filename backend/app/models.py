from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, Numeric, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    manager_name = Column(String(100))
    contact_phone = Column(String(30))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    stock_items = relationship("Stock", back_populates="store")
    promotions = relationship("Promotion", back_populates="store")
    users = relationship("User", back_populates="store")
    orders = relationship("Order", back_populates="store")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    brand = Column(String(100), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(Text)
    is_new = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    sizes = relationship("ProductSize", back_populates="product")
    colours = relationship("ProductColour", back_populates="product")
    stock_items = relationship("Stock", back_populates="product")
    promotions = relationship("Promotion", back_populates="product")

    @property
    def color(self):
        return self.colours[0].colour_name if self.colours else None


class ProductSize(Base):
    __tablename__ = "product_sizes"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    size_label = Column(String(20), nullable=False)

    product = relationship("Product", back_populates="sizes")


class ProductColour(Base):
    __tablename__ = "product_colours"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    colour_name = Column(String(50), nullable=False)

    product = relationship("Product", back_populates="colours")


class Stock(Base):
    __tablename__ = "stock"
    __table_args__ = (UniqueConstraint("store_id", "product_id", name="uq_store_product"),)

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="Available")
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="stock_items")
    product = relationship("Product", back_populates="stock_items")


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    discount_percent = Column(Numeric(5, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    title = Column(String(150))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    store = relationship("Store", back_populates="promotions")
    product = relationship("Product", back_populates="promotions")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String(30), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="SET NULL"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    store = relationship("Store", back_populates="users")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False)
    customer_full_name = Column(String(120), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    customer_email = Column(String(150))
    customer_place = Column(String(100))
    customer_district = Column(String(100))
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    status = Column(String(40), default="Pending Payment")
    total_amount = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime, server_default=func.now())

    store = relationship("Store", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete")
    payment = relationship("Payment", back_populates="order", uselist=False)
    receipt = relationship("Receipt", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(150), nullable=False)
    size_label = Column(String(20))
    colour_name = Column(String(50))
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    payment_method = Column(String(30), nullable=False)
    payment_phone = Column(String(30))
    amount = Column(Numeric(10, 2), nullable=False)
    provider_reference = Column(String(100))
    payment_status = Column(String(30), default="Pending")
    paid_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="payment")


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    receipt_number = Column(String(50), unique=True, nullable=False)
    issued_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="receipt")


class WarrantyClaim(Base):
    __tablename__ = "warranty_claims"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    customer_full_name = Column(String(120), nullable=False)
    customer_phone = Column(String(30), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="Pending")
    created_at = Column(DateTime, server_default=func.now())
