import os

from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from typing import Optional

from app.database import SessionLocal, engine, Base
from app import models, schemas, crud
from app.services.production_seed import seed_production_data
from app.services.retail_ai import build_stock_recommendations
from app.utils.security import create_access_token, decode_access_token

Base.metadata.create_all(bind=engine)


def ensure_phase3_schema():
    inspector = inspect(engine)
    if "products" in inspector.get_table_names():
        product_columns = {column["name"] for column in inspector.get_columns("products")}
        if "barcode" not in product_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE products ADD COLUMN barcode VARCHAR(100)"))


ensure_phase3_schema()

app = FastAPI(title="Studio 88 Lesotho API")

local_frontend_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://studio88-lesotho.vercel.app",
]
configured_frontend_origin = os.getenv("FRONTEND_ORIGIN")
allowed_origins = local_frontend_origins + (
    [configured_frontend_origin] if configured_frontend_origin else []
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authentication token")

    token = authorization.replace("Bearer ", "", 1).strip()
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user = crud.get_user_by_email(db, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive or unknown user")
    return user


def require_roles(*roles: str):
    allowed_roles = {role.upper() for role in roles}

    def checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role.upper() not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return checker


@app.get("/")
def root():
    return {"message": "Studio 88 Lesotho backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/admin/seed-production")
def seed_production(
    x_seed_secret: Optional[str] = Header(default=None, alias="x-seed-secret"),
    db: Session = Depends(get_db),
):
    seed_secret = os.getenv("SEED_SECRET", "studio88seed2026")
    if not seed_secret:
        raise HTTPException(status_code=503, detail="Production seed endpoint is disabled")
    if x_seed_secret != seed_secret:
        raise HTTPException(status_code=403, detail="Invalid seed secret")

    try:
        return seed_production_data(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Seed failed: {type(exc).__name__}: {exc}")


@app.post("/stores", response_model=schemas.StoreRead)
def create_store(
    store: schemas.StoreCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.create_store(db, store)


@app.get("/stores", response_model=list[schemas.StoreRead])
def get_stores(db: Session = Depends(get_db)):
    return crud.get_stores(db)


@app.get("/stores/{store_id}", response_model=schemas.StoreRead)
def get_store(store_id: int, db: Session = Depends(get_db)):
    store = crud.get_store(db, store_id)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@app.post("/products", response_model=schemas.ProductRead)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    created_product = crud.create_product(db, product)
    crud.log_audit(
        db,
        current_user.email,
        current_user.role,
        "Create product",
        "product",
        created_product.id,
        f"Created product {created_product.name}.",
    )
    db.commit()
    return created_product


@app.get("/products", response_model=list[schemas.ProductRead])
def get_products(db: Session = Depends(get_db)):
    return crud.get_products(db)


@app.patch("/products/{product_id}/barcode", response_model=schemas.ProductRead)
def update_product_barcode(
    product_id: int,
    update: schemas.ProductBarcodeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    product = crud.update_product_barcode(db, product_id, update.barcode)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    crud.log_audit(
        db,
        current_user.email,
        current_user.role,
        "Update barcode",
        "product",
        product.id,
        f"Updated barcode for {product.name}.",
    )
    db.commit()
    return product


@app.post("/stock", response_model=schemas.StockRead)
def create_or_update_stock(
    stock: schemas.StockCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    if current_user.role.upper() == "MANAGER" and stock.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="Managers can only update their own branch stock")
    updated_stock = crud.create_or_update_stock(db, stock)
    crud.log_audit(
        db,
        current_user.email,
        current_user.role,
        "Update stock",
        "stock",
        updated_stock.id,
        f"Stock updated for product {stock.product_id} at store {stock.store_id}.",
    )
    db.commit()
    return updated_stock


@app.get("/stock", response_model=list[schemas.StockRead])
def get_stock(db: Session = Depends(get_db)):
    return crud.get_stock(db)


@app.get("/stores/{store_id}/stock", response_model=list[schemas.StockRead])
def get_stock_by_store(store_id: int, db: Session = Depends(get_db)):
    return crud.get_stock_by_store(db, store_id)


@app.get("/manager/stock", response_model=list[schemas.StockRead])
def get_manager_stock(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("MANAGER")),
):
    return crud.get_stock_by_store(db, current_user.store_id)


@app.post("/promotions", response_model=schemas.PromotionRead)
def create_promotion(
    promotion: schemas.PromotionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    created_promotion = crud.create_promotion(db, promotion)
    crud.log_audit(
        db,
        current_user.email,
        current_user.role,
        "Create promotion",
        "promotion",
        created_promotion.id,
        f"Created promotion for product {promotion.product_id}.",
    )
    db.commit()
    return created_promotion


@app.get("/promotions", response_model=list[schemas.PromotionRead])
def get_promotions(db: Session = Depends(get_db)):
    return crud.get_promotions(db)


@app.post("/users", response_model=schemas.UserRead)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.create_user(db, user)


@app.get("/users", response_model=list[schemas.UserRead])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_users(db)


@app.post("/auth/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "store_id": user.store_id,
    })
    crud.log_audit(
        db,
        user.email,
        user.role,
        "Login",
        "user",
        user.id,
        f"{user.full_name} logged in.",
    )
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "store_id": user.store_id,
    }


@app.post("/orders", response_model=schemas.OrderRead)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    return crud.create_order(db, order)


@app.get("/orders", response_model=list[schemas.OrderRead])
def get_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    if current_user.role.upper() == "MANAGER":
        return crud.get_orders_by_store(db, current_user.store_id)
    return crud.get_orders(db)


@app.get("/orders/search")
def search_orders(
    query: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    return crud.search_orders(db, query, current_user.store_id if current_user.role.upper() == "MANAGER" else None)


@app.get("/orders/{order_id}", response_model=schemas.OrderRead)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role.upper() == "MANAGER" and order.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="Managers can only view their own branch orders")
    return order


@app.patch("/orders/{order_id}/status", response_model=schemas.OrderRead)
def update_order_status(
    order_id: int,
    update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    existing_order = crud.get_order(db, order_id)
    if not existing_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role.upper() == "MANAGER" and existing_order.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="Managers can only update their own branch orders")
    try:
        order = crud.update_order_status(db, order_id, update.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    crud.log_audit(
        db,
        current_user.email,
        current_user.role,
        "Update order status",
        "order",
        order.id,
        f"Order {order.order_number} updated to {update.status}.",
    )
    db.commit()
    return order


@app.post("/payments/confirm", response_model=schemas.OrderRead)
def confirm_payment(payment: schemas.PaymentConfirm, db: Session = Depends(get_db)):
    try:
        order = crud.confirm_payment(db, payment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not order:
        raise HTTPException(status_code=404, detail="Order/payment not found")
    return order


@app.post("/payments/stripe/create-checkout-session", response_model=schemas.StripeCheckoutSessionRead)
def create_stripe_checkout_session(session_data: schemas.StripeCheckoutSessionCreate, db: Session = Depends(get_db)):
    session = crud.create_stripe_checkout_session(db, session_data)
    if not session:
        raise HTTPException(status_code=404, detail="Order not found")
    return session


@app.post("/payments/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    try:
        payload = await request.body()
        return crud.handle_stripe_webhook(db, payload, stripe_signature)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/payments/stripe/mark-paid/{order_id}", response_model=schemas.OrderRead)
def mark_stripe_paid(order_id: int, session_id: Optional[str] = None, db: Session = Depends(get_db)):
    order = crud.mark_stripe_payment_paid(db, order_id, session_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order/payment not found")
    return order


@app.get("/orders/{order_id}/receipt")
def get_receipt(order_id: int, db: Session = Depends(get_db)):
    receipt = crud.get_receipt(db, order_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@app.post("/warranty", response_model=schemas.WarrantyRead)
def create_warranty_claim(claim: schemas.WarrantyCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_warranty_claim(db, claim)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/warranty", response_model=list[schemas.WarrantyRead])
def get_warranty_claims(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_warranty_claims(db)


@app.patch("/warranty/{claim_id}/status", response_model=schemas.WarrantyRead)
def update_warranty_status(
    claim_id: int,
    update: schemas.WarrantyStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    claim = crud.update_warranty_status(db, claim_id, update.status)
    if not claim:
        raise HTTPException(status_code=404, detail="Warranty claim not found")
    crud.log_audit(
        db,
        current_user.email,
        current_user.role,
        "Update warranty status",
        "warranty",
        claim.id,
        f"Warranty claim updated to {update.status}.",
    )
    db.commit()
    return claim


@app.get("/analytics/overview")
def analytics_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_analytics_overview(db)


@app.get("/analytics/branches")
def analytics_branches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_analytics_branches(db)


@app.get("/analytics/products")
def analytics_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_analytics_products(db)


@app.get("/analytics/revenue")
def analytics_revenue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_analytics_revenue(db)


@app.get("/analytics/low-stock")
def analytics_low_stock(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_analytics_low_stock(db)


@app.get("/ai/stock-recommendations")
def ai_stock_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    store_id = current_user.store_id if current_user.role.upper() == "MANAGER" else None
    return build_stock_recommendations(db, store_id)


@app.get("/notifications", response_model=list[schemas.NotificationRead])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    return crud.get_notifications(db, current_user)


@app.patch("/notifications/{notification_id}/read", response_model=schemas.NotificationRead)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER", "MANAGER")),
):
    notification = crud.mark_notification_read(db, notification_id, current_user)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@app.get("/audit-logs", response_model=list[schemas.AuditLogRead])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN", "DEVELOPER")),
):
    return crud.get_audit_logs(db)
