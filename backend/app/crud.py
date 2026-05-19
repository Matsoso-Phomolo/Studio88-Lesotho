from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
import uuid
import os
from typing import Optional

from app import models, schemas
from app.services.stock_service import calculate_stock_status
from app.utils.security import hash_password, verify_password

try:
    import stripe
except ImportError:
    stripe = None


PAYMENT_REFERENCE_PREFIXES = {
    "M-Pesa": "MPESA",
    "EcoCash": "ECOCASH",
    "Bank Card": "CARD",
    "Stripe": "STRIPE",
}

ORDER_STATUSES = {
    "Pending",
    "Confirmed",
    "Ready for Collection",
    "Collected",
    "Cancelled",
}

PAID_ORDER_STATUSES = {"Confirmed", "Ready for Collection", "Collected"}


def create_store(db: Session, store: schemas.StoreCreate):
    db_store = models.Store(**store.model_dump())
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    return db_store


def get_stores(db: Session):
    return db.query(models.Store).all()


def get_store(db: Session, store_id: int):
    return db.query(models.Store).filter(models.Store.id == store_id).first()


def create_product(db: Session, product: schemas.ProductCreate):
    data = product.model_dump()
    color = data.pop("color", None)
    db_product = models.Product(**data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    if color:
        db.add(models.ProductColour(product_id=db_product.id, colour_name=color))
        db.commit()
        db.refresh(db_product)

    return db_product


def get_products(db: Session):
    products = db.query(models.Product).all()
    changed = False
    for product in products:
        if not product.barcode:
            product.barcode = generate_product_barcode(product.id)
            changed = True
    if changed:
        db.commit()
    return products


def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()


def generate_product_barcode(product_id: int) -> str:
    return f"ST88-{product_id}"


def update_product_barcode(db: Session, product_id: int, barcode: Optional[str] = None):
    product = get_product(db, product_id)
    if not product:
        return None
    product.barcode = barcode or generate_product_barcode(product.id)
    db.commit()
    db.refresh(product)
    return product


def create_or_update_stock(db: Session, stock: schemas.StockCreate):
    status = calculate_stock_status(stock.quantity)

    existing_stock = db.query(models.Stock).filter(
        models.Stock.store_id == stock.store_id,
        models.Stock.product_id == stock.product_id
    ).first()

    if existing_stock:
        existing_stock.quantity = stock.quantity
        existing_stock.status = status
        if stock.quantity <= 5:
            create_notification(
                db,
                title="Low stock alert" if stock.quantity > 0 else "Out of stock alert",
                message=f"Product {stock.product_id} at store {stock.store_id} has quantity {stock.quantity}.",
                type_="stock",
                severity="warning" if stock.quantity > 0 else "critical",
                role_target="MANAGER",
                store_id=stock.store_id,
            )
        db.commit()
        db.refresh(existing_stock)
        return existing_stock

    db_stock = models.Stock(
        store_id=stock.store_id,
        product_id=stock.product_id,
        quantity=stock.quantity,
        status=status
    )

    db.add(db_stock)
    if stock.quantity <= 5:
        create_notification(
            db,
            title="Low stock alert" if stock.quantity > 0 else "Out of stock alert",
            message=f"Product {stock.product_id} at store {stock.store_id} has quantity {stock.quantity}.",
            type_="stock",
            severity="warning" if stock.quantity > 0 else "critical",
            role_target="MANAGER",
            store_id=stock.store_id,
        )
    db.commit()
    db.refresh(db_stock)
    return db_stock


def get_stock(db: Session):
    return db.query(models.Stock).all()


def get_stock_by_store(db: Session, store_id: int):
    return db.query(models.Stock).filter(models.Stock.store_id == store_id).all()


def create_promotion(db: Session, promotion: schemas.PromotionCreate):
    db_promotion = models.Promotion(**promotion.model_dump())
    db.add(db_promotion)
    db.commit()
    db.refresh(db_promotion)
    return db_promotion


def get_promotions(db: Session):
    return db.query(models.Promotion).all()


def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role.upper(),
        store_id=user.store_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session):
    return db.query(models.User).all()


def get_user_by_email(db: Session, email: str):
    if not email:
        return None
    return db.query(models.User).filter(models.User.email == email).first()


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_order(db: Session, order: schemas.OrderCreate):
    order_number = "ORD-" + uuid.uuid4().hex[:8].upper()

    total = sum(item.quantity * item.unit_price for item in order.items)

    db_order = models.Order(
        order_number=order_number,
        customer_full_name=order.customer_full_name,
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        customer_place=order.customer_place,
        customer_district=order.customer_district,
        store_id=order.store_id,
        status="Pending",
        total_amount=total,
    )

    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    for item in order.items:
        subtotal = item.quantity * item.unit_price
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            product_name=item.product_name,
            size_label=item.size_label,
            colour_name=item.colour_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=subtotal,
        )
        db.add(db_item)

    db_payment = models.Payment(
        order_id=db_order.id,
        payment_method=order.payment_method,
        payment_phone=order.payment_phone,
        amount=total,
        payment_status="Pending",
    )
    db.add(db_payment)
    create_notification(
        db,
        title="New order",
        message=f"New order {db_order.order_number} created for {order.customer_full_name}.",
        type_="order",
        severity="info",
        role_target="MANAGER",
        store_id=order.store_id,
    )
    log_audit(
        db,
        user_email="customer",
        user_role="CUSTOMER",
        action="Create order",
        entity_type="order",
        entity_id=db_order.id,
        description=f"Customer order {db_order.order_number} created.",
    )

    db.commit()
    db.refresh(db_order)
    return db_order


def get_orders(db: Session):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()


def get_orders_by_store(db: Session, store_id: int):
    return (
        db.query(models.Order)
        .filter(models.Order.store_id == store_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()


def search_orders(db: Session, query: str, store_id: Optional[int] = None):
    pattern = f"%{query}%"
    order_query = db.query(models.Order).filter(
        or_(
            models.Order.order_number.ilike(pattern),
            models.Order.customer_full_name.ilike(pattern),
            models.Order.customer_phone.ilike(pattern),
            models.Order.status.ilike(pattern),
        )
    )

    if store_id is not None:
        order_query = order_query.filter(models.Order.store_id == store_id)

    return order_query.order_by(models.Order.created_at.desc()).all()


def update_order_status(db: Session, order_id: int, status: str):
    order = get_order(db, order_id)
    if not order:
        return None
    if status not in ORDER_STATUSES:
        raise ValueError("Unsupported order status")
    if status == "Cancelled" and order.status in PAID_ORDER_STATUSES:
        raise ValueError("Paid orders cannot be cancelled. Orders are not refundable.")
    order.status = status
    if status == "Ready for Collection":
        create_notification(
            db,
            title="Order ready for collection",
            message=f"Order {order.order_number} is ready for collection.",
            type_="order",
            severity="success",
            role_target="MANAGER",
            store_id=order.store_id,
        )
    db.commit()
    db.refresh(order)
    return order


def confirm_payment(db: Session, payment: schemas.PaymentConfirm):
    order = get_order(db, payment.order_id)
    if not order:
        return None

    db_payment = db.query(models.Payment).filter(models.Payment.order_id == payment.order_id).first()
    if not db_payment:
        return None

    payment_method = payment.payment_method
    if payment_method in ("M-Pesa", "EcoCash") and not payment.payment_phone:
        raise ValueError("payment_phone is required for mobile money payments")

    if payment_method == "Stripe":
        raise ValueError("Use Stripe checkout session for Stripe payments")

    prefix = PAYMENT_REFERENCE_PREFIXES.get(payment_method, "PAY")
    db_payment.payment_method = payment.payment_method
    db_payment.payment_phone = payment.payment_phone
    db_payment.payment_status = "Paid"
    db_payment.provider_reference = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"
    db_payment.paid_at = datetime.utcnow()

    order.status = "Confirmed"
    log_audit(
        db,
        user_email="customer",
        user_role="CUSTOMER",
        action="Confirm payment",
        entity_type="payment",
        entity_id=db_payment.id,
        description=f"{payment_method} payment confirmed for order {order.order_number}.",
    )

    receipt = db.query(models.Receipt).filter(models.Receipt.order_id == order.id).first()
    if not receipt:
        receipt = models.Receipt(
            order_id=order.id,
            receipt_number="RCT-" + uuid.uuid4().hex[:8].upper()
        )
        db.add(receipt)

    db.commit()
    db.refresh(order)
    return order


def _ensure_receipt(db: Session, order_id: int):
    receipt = db.query(models.Receipt).filter(models.Receipt.order_id == order_id).first()
    if not receipt:
        receipt = models.Receipt(
            order_id=order_id,
            receipt_number="RCT-" + uuid.uuid4().hex[:8].upper()
        )
        db.add(receipt)
    return receipt


def create_stripe_checkout_session(db: Session, session_data: schemas.StripeCheckoutSessionCreate):
    order = get_order(db, session_data.order_id)
    if not order:
        return None

    db_payment = db.query(models.Payment).filter(models.Payment.order_id == order.id).first()
    if not db_payment:
        db_payment = models.Payment(
            order_id=order.id,
            payment_method="Stripe",
            amount=order.total_amount,
            payment_status="Pending",
        )
        db.add(db_payment)

    db_payment.payment_method = "Stripe"
    db_payment.payment_status = "Pending"

    frontend_url = os.getenv("FRONTEND_ORIGIN") or os.getenv("FRONTEND_URL", "http://localhost:5173")
    stripe_secret_key = os.getenv("STRIPE_SECRET_KEY")

    if stripe and stripe_secret_key:
        stripe.api_key = stripe_secret_key
        checkout_session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": os.getenv("STRIPE_CURRENCY", "zar"),
                        "product_data": {
                            "name": f"Studio 88 order {order.order_number}",
                        },
                        "unit_amount": int(float(order.total_amount) * 100),
                    },
                    "quantity": 1,
                }
            ],
            metadata={"order_id": str(order.id)},
            success_url=f"{frontend_url}/?stripe_success=1&order_id={order.id}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/?stripe_cancel=1&order_id={order.id}",
        )
        db_payment.provider_reference = checkout_session.id
        checkout_url = checkout_session.url
        session_id = checkout_session.id
    else:
        session_id = "STRIPE-TEST-" + uuid.uuid4().hex[:8].upper()
        db_payment.provider_reference = session_id
        checkout_url = f"{frontend_url}/?stripe_success=1&order_id={order.id}&session_id={session_id}"

    db.commit()

    return {
        "checkout_url": checkout_url,
        "session_id": session_id,
        "payment_status": db_payment.payment_status,
    }


def mark_stripe_payment_paid(db: Session, order_id: int, provider_reference: Optional[str] = None):
    order = get_order(db, order_id)
    if not order:
        return None

    db_payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    if not db_payment:
        return None

    db_payment.payment_method = "Stripe"
    db_payment.payment_status = "Paid"
    db_payment.provider_reference = provider_reference or db_payment.provider_reference or f"STRIPE-{uuid.uuid4().hex[:6].upper()}"
    db_payment.paid_at = datetime.utcnow()
    order.status = "Confirmed"
    _ensure_receipt(db, order.id)
    log_audit(
        db,
        user_email="stripe",
        user_role="PAYMENT_PROVIDER",
        action="Confirm payment",
        entity_type="payment",
        entity_id=db_payment.id,
        description=f"Stripe payment confirmed for order {order.order_number}.",
    )

    db.commit()
    db.refresh(order)
    return order


def handle_stripe_webhook(db: Session, payload: bytes, signature: Optional[str]):
    stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if stripe and stripe_webhook_secret:
        event = stripe.Webhook.construct_event(payload, signature, stripe_webhook_secret)
    else:
        import json
        event = json.loads(payload.decode("utf-8"))

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        order_id = data_object.get("metadata", {}).get("order_id")
        if order_id:
            mark_stripe_payment_paid(db, int(order_id), data_object.get("id"))

    return {"received": True}


def get_receipt(db: Session, order_id: int):
    order = get_order(db, order_id)
    if not order:
        return None

    payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    receipt = db.query(models.Receipt).filter(models.Receipt.order_id == order_id).first()
    store = db.query(models.Store).filter(models.Store.id == order.store_id).first()

    return {
        "order": order,
        "payment": payment,
        "receipt": receipt,
        "store": store,
        "policy": "NO REFUNDS. Warranty applies according to store policy. Keep this receipt for warranty claims."
    }


def create_warranty_claim(db: Session, claim: schemas.WarrantyCreate):
    receipt = db.query(models.Receipt).filter(models.Receipt.order_id == claim.order_id).first()
    if not receipt:
        raise ValueError("Warranty claims require a valid receipt.")

    db_claim = models.WarrantyClaim(**claim.model_dump())
    db.add(db_claim)
    create_notification(
        db,
        title="Warranty request",
        message=f"Warranty claim created for order {claim.order_id}.",
        type_="warranty",
        severity="warning",
        role_target="ADMIN",
        store_id=None,
    )
    log_audit(
        db,
        user_email="customer",
        user_role="CUSTOMER",
        action="Create warranty request",
        entity_type="warranty",
        entity_id=claim.order_id,
        description="Customer submitted a warranty claim.",
    )
    db.commit()
    db.refresh(db_claim)
    return db_claim


def get_warranty_claims(db: Session):
    return db.query(models.WarrantyClaim).order_by(models.WarrantyClaim.created_at.desc()).all()


def update_warranty_status(db: Session, claim_id: int, status: str):
    claim = db.query(models.WarrantyClaim).filter(models.WarrantyClaim.id == claim_id).first()
    if not claim:
        return None
    claim.status = status
    log_audit(
        db,
        user_email="system",
        user_role="ADMIN",
        action="Update warranty status",
        entity_type="warranty",
        entity_id=claim.id,
        description=f"Warranty claim updated to {status}.",
    )
    db.commit()
    db.refresh(claim)
    return claim


def log_audit(
    db: Session,
    user_email: str,
    user_role: str,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    description: Optional[str] = None,
):
    audit_log = models.AuditLog(
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
    )
    db.add(audit_log)
    return audit_log


def get_audit_logs(db: Session):
    return db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(100).all()


def create_notification(
    db: Session,
    title: str,
    message: str,
    type_: str,
    severity: str,
    role_target: str,
    store_id: Optional[int] = None,
):
    notification = models.Notification(
        title=title,
        message=message,
        type=type_,
        severity=severity,
        role_target=role_target,
        store_id=store_id,
    )
    db.add(notification)
    return notification


def get_notifications(db: Session, user):
    query = db.query(models.Notification)
    role = user.role.upper()
    if role == "MANAGER":
        query = query.filter(
            models.Notification.role_target == "MANAGER",
            models.Notification.store_id == user.store_id,
        )
    elif role == "ADMIN":
        query = query.filter(models.Notification.role_target.in_(["ADMIN", "EXECUTIVE", "MANAGER"]))
    elif role == "DEVELOPER":
        query = query
    else:
        query = query.filter(models.Notification.role_target == role)

    return query.order_by(models.Notification.created_at.desc()).limit(50).all()


def mark_notification_read(db: Session, notification_id: int, user):
    notifications = get_notifications(db, user)
    notification = next((item for item in notifications if item.id == notification_id), None)
    if not notification:
        return None
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def get_analytics_overview(db: Session):
    paid_statuses = ["Confirmed", "Ready for Collection", "Collected"]
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Order.total_amount), 0))
        .filter(models.Order.status.in_(paid_statuses))
        .scalar()
    )
    total_stock = db.query(func.coalesce(func.sum(models.Stock.quantity), 0)).scalar()
    return {
        "total_revenue": float(total_revenue or 0),
        "total_orders": db.query(models.Order).count(),
        "total_products": db.query(models.Product).count(),
        "total_stock": int(total_stock or 0),
        "low_stock_count": db.query(models.Stock).filter(models.Stock.quantity <= 5).count(),
        "promotions_count": db.query(models.Promotion).filter(models.Promotion.is_active == True).count(),
    }


def get_analytics_branches(db: Session):
    paid_statuses = ["Confirmed", "Ready for Collection", "Collected"]
    branches = []
    for store in db.query(models.Store).all():
        orders = db.query(models.Order).filter(models.Order.store_id == store.id).all()
        stock_units = (
            db.query(func.coalesce(func.sum(models.Stock.quantity), 0))
            .filter(models.Stock.store_id == store.id)
            .scalar()
        )
        branches.append({
            "store_id": store.id,
            "name": store.name,
            "location": store.location,
            "orders": len(orders),
            "revenue": float(sum(float(order.total_amount or 0) for order in orders if order.status in paid_statuses)),
            "stock_units": int(stock_units or 0),
            "low_stock": db.query(models.Stock).filter(models.Stock.store_id == store.id, models.Stock.quantity <= 5).count(),
        })
    return branches


def get_analytics_products(db: Session):
    movement = []
    for product in db.query(models.Product).all():
        ordered_units = (
            db.query(func.coalesce(func.sum(models.OrderItem.quantity), 0))
            .filter(models.OrderItem.product_id == product.id)
            .scalar()
        )
        stock_units = (
            db.query(func.coalesce(func.sum(models.Stock.quantity), 0))
            .filter(models.Stock.product_id == product.id)
            .scalar()
        )
        movement.append({
            "product_id": product.id,
            "name": product.name,
            "brand": product.brand,
            "barcode": product.barcode or generate_product_barcode(product.id),
            "ordered_units": int(ordered_units or 0),
            "stock_units": int(stock_units or 0),
        })
    return sorted(movement, key=lambda item: item["ordered_units"], reverse=True)


def get_analytics_revenue(db: Session):
    paid_statuses = ["Confirmed", "Ready for Collection", "Collected"]
    return [
        {
            "store_id": branch["store_id"],
            "name": branch["name"],
            "revenue": branch["revenue"],
        }
        for branch in get_analytics_branches(db)
        if branch["revenue"] >= 0
    ]


def get_analytics_low_stock(db: Session):
    items = []
    for stock in db.query(models.Stock).filter(models.Stock.quantity <= 5).all():
        product = get_product(db, stock.product_id)
        store = get_store(db, stock.store_id)
        items.append({
            "stock_id": stock.id,
            "store_id": stock.store_id,
            "store_name": store.name if store else "Unknown Store",
            "product_id": stock.product_id,
            "product_name": product.name if product else "Unknown Product",
            "quantity": stock.quantity,
            "status": stock.status,
        })
    return items
