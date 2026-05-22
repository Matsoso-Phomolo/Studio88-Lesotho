from datetime import date, timedelta

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session, selectinload

from app import models, schemas, crud
from app.database import engine
from app.services.stock_service import calculate_stock_status
from app.utils.security import hash_password, verify_password


DEFAULT_PASSWORD = "admin123"

STORES = [
    {"id": 1, "name": "Kingsway Mall", "location": "Maseru", "manager_name": "Letlotlo Mandoza"},
    {"id": 2, "name": "Lepoqong Mall", "location": "Maseru", "manager_name": "Nthati Rampobole"},
    {"id": 3, "name": "Pioneer Mall", "location": "Maseru", "manager_name": "Atlehang Hlatsi"},
    {"id": 4, "name": "Maseru Mall", "location": "Maseru", "manager_name": "Ndeye Mohapi"},
    {"id": 5, "name": "Mafeteng", "location": "Mafeteng", "manager_name": "Limpho Moeti"},
    {"id": 6, "name": "Maputsoe", "location": "Maputsoe", "manager_name": "Khosi Machake"},
    {"id": 7, "name": "Matsoso Mall", "location": "Maseru", "manager_name": "Senate Matsoso"},
]

USERS = [
    {"full_name": "Puleng Nkole", "email": "puleng.executive@studio88.co.ls", "role": "ADMIN", "store_id": None},
    {"full_name": "Matsoso Phomolo", "email": "matsoso.dev@studio88.co.ls", "role": "DEVELOPER", "store_id": None},
    {"full_name": "Matsoso Phomolo", "email": "matsoso.it@studio88.co.ls", "role": "DEVELOPER", "store_id": None},
    {"full_name": "Letlotlo Mandoza", "email": "letlotlo.manager@studio88.co.ls", "role": "MANAGER", "store_id": 1},
    {"full_name": "Nthati Rampobole", "email": "nthati.manager@studio88.co.ls", "role": "MANAGER", "store_id": 2},
    {"full_name": "Atlehang Hlatsi", "email": "atlehang.manager@studio88.co.ls", "role": "MANAGER", "store_id": 3},
    {"full_name": "Ndeye Mohapi", "email": "ndeye.manager@studio88.co.ls", "role": "MANAGER", "store_id": 4},
    {"full_name": "Limpho Moeti", "email": "limpho.manager@studio88.co.ls", "role": "MANAGER", "store_id": 5},
    {"full_name": "Khosi Machake", "email": "khosi.manager@studio88.co.ls", "role": "MANAGER", "store_id": 6},
    {"full_name": "Senate Matsoso", "email": "senate.manager@studio88.co.ls", "role": "MANAGER", "store_id": 7},
]

PRODUCTS = [
    {"name": "Nike Air Max 90", "brand": "Nike", "price": 1999.00, "color": "Black", "is_new": True},
    {"name": "Nike Air Force 1", "brand": "Nike", "price": 1899.00, "color": "White", "is_new": False},
    {"name": "Adidas Ultraboost", "brand": "Adidas", "price": 2299.00, "color": "Black/White", "is_new": True},
    {"name": "Puma RS-X", "brand": "Puma", "price": 1599.00, "color": "Multi", "is_new": True},
    {"name": "New Balance 550", "brand": "New Balance", "price": 1799.00, "color": "White/Green", "is_new": True},
]

STOCK_QUANTITIES = [
    [18, 12, 9, 15, 7],
    [10, 6, 14, 8, 20],
    [5, 16, 11, 13, 9],
    [19, 8, 6, 17, 12],
    [7, 11, 18, 5, 16],
    [14, 20, 10, 6, 8],
    [12, 9, 15, 19, 5],
]


def _add_column_if_missing(table_name: str, column_name: str, definition: str) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name in columns:
        return
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


def ensure_production_seed_schema() -> None:
    _add_column_if_missing("stores", "manager_name", "VARCHAR(100)")
    _add_column_if_missing("stores", "contact_phone", "VARCHAR(30)")
    _add_column_if_missing("stores", "is_active", "BOOLEAN DEFAULT TRUE")
    _add_column_if_missing("stores", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    _add_column_if_missing("products", "category", "VARCHAR(100)")
    _add_column_if_missing("products", "description", "TEXT")
    _add_column_if_missing("products", "barcode", "VARCHAR(100)")
    _add_column_if_missing("products", "image_url", "TEXT")
    _add_column_if_missing("products", "is_new", "BOOLEAN DEFAULT FALSE")
    _add_column_if_missing("products", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    _add_column_if_missing("stock", "status", "VARCHAR(30) DEFAULT 'Available'")
    _add_column_if_missing("stock", "last_updated", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    _add_column_if_missing("promotions", "store_id", "INTEGER")
    _add_column_if_missing("promotions", "start_date", "DATE")
    _add_column_if_missing("promotions", "end_date", "DATE")
    _add_column_if_missing("promotions", "title", "VARCHAR(150)")
    _add_column_if_missing("promotions", "is_active", "BOOLEAN DEFAULT TRUE")
    _add_column_if_missing("promotions", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    _add_column_if_missing("users", "store_id", "INTEGER")
    _add_column_if_missing("users", "is_active", "BOOLEAN DEFAULT TRUE")
    _add_column_if_missing("users", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")


def _safe_password_hash(existing_hash: str | None) -> bool:
    if not existing_hash:
        return False
    try:
        return verify_password(DEFAULT_PASSWORD, existing_hash)
    except ValueError:
        return False


def _upsert_store(db: Session, store_data: dict) -> str:
    store = db.query(models.Store).filter(models.Store.id == store_data["id"]).first()
    if store:
        store.name = store_data["name"]
        store.location = store_data["location"]
        store.manager_name = store_data["manager_name"]
        store.is_active = True
        return "updated"

    db.add(models.Store(**store_data, is_active=True))
    return "created"


def _upsert_user(db: Session, user_data: dict) -> str:
    user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
    if user:
        user.full_name = user_data["full_name"]
        user.role = user_data["role"]
        user.store_id = user_data["store_id"]
        user.is_active = True
        if not _safe_password_hash(user.password_hash):
            user.password_hash = hash_password(DEFAULT_PASSWORD)
        return "updated"

    db.add(
        models.User(
            full_name=user_data["full_name"],
            email=user_data["email"],
            password_hash=hash_password(DEFAULT_PASSWORD),
            role=user_data["role"],
            store_id=user_data["store_id"],
            is_active=True,
        )
    )
    return "created"


def _upsert_product(db: Session, product_data: dict) -> tuple[models.Product, str]:
    color = product_data["color"]
    product = (
        db.query(models.Product)
        .options(selectinload(models.Product.colours))
        .filter(models.Product.name == product_data["name"])
        .first()
    )
    action = "updated" if product else "created"

    if not product:
        product = crud.create_product(
            db,
            schemas.ProductCreate(
                name=product_data["name"],
                brand=product_data["brand"],
                category="Sneakers",
                description=f"{product_data['brand']} Studio 88 sneaker in {color}.",
                price=product_data["price"],
                color=color,
                barcode=None,
                is_new=product_data["is_new"],
            ),
        )
    else:
        product.brand = product_data["brand"]
        product.category = "Sneakers"
        product.description = f"{product_data['brand']} Studio 88 sneaker in {color}."
        product.price = product_data["price"]
        product.is_new = product_data["is_new"]

    if not product.barcode:
        product.barcode = crud.generate_product_barcode(product.id)

    colour = (
        db.query(models.ProductColour)
        .filter(models.ProductColour.product_id == product.id)
        .first()
    )
    if colour:
        colour.colour_name = color
    else:
        db.add(models.ProductColour(product_id=product.id, colour_name=color))

    return product, action


def _upsert_stock(db: Session, store_id: int, product_id: int, quantity: int) -> str:
    stock = (
        db.query(models.Stock)
        .filter(models.Stock.store_id == store_id, models.Stock.product_id == product_id)
        .first()
    )
    action = "updated" if stock else "created"
    if not stock:
        stock = models.Stock(store_id=store_id, product_id=product_id)
        db.add(stock)
    stock.quantity = quantity
    stock.status = calculate_stock_status(quantity)
    return action


def _upsert_promotion(
    db: Session,
    store_id: int,
    product_id: int,
    title: str,
    discount_percent: float,
    start_date: date,
    end_date: date,
) -> str:
    promotion = (
        db.query(models.Promotion)
        .filter(
            models.Promotion.store_id == store_id,
            models.Promotion.product_id == product_id,
            models.Promotion.title == title,
        )
        .first()
    )
    action = "updated" if promotion else "created"
    if not promotion:
        promotion = models.Promotion(store_id=store_id, product_id=product_id, title=title)
        db.add(promotion)
    promotion.discount_percent = discount_percent
    promotion.start_date = start_date
    promotion.end_date = end_date
    promotion.is_active = True
    return action


def seed_production_data(db: Session) -> dict:
    ensure_production_seed_schema()

    summary = {
        "stores": {"created": 0, "updated": 0},
        "users": {"created": 0, "updated": 0},
        "products": {"created": 0, "updated": 0},
        "stock": {"created": 0, "updated": 0},
        "promotions": {"created": 0, "updated": 0},
    }

    for store in STORES:
        summary["stores"][_upsert_store(db, store)] += 1
    db.commit()

    for user in USERS:
        summary["users"][_upsert_user(db, user)] += 1
    db.commit()

    products = []
    for product_data in PRODUCTS:
        product, action = _upsert_product(db, product_data)
        products.append(product)
        summary["products"][action] += 1
    db.commit()

    for store_index, store in enumerate(STORES):
        for product_index, product in enumerate(products):
            quantity = STOCK_QUANTITIES[store_index][product_index]
            action = _upsert_stock(db, store["id"], product.id, quantity)
            summary["stock"][action] += 1
    db.commit()

    today = date.today()
    end_date = today + timedelta(days=30)
    nike_products = [product for product in products if product.brand == "Nike"]
    for store in STORES[:4]:
        for product in nike_products:
            action = _upsert_promotion(
                db,
                store["id"],
                product.id,
                "10% discount on Nike",
                10.00,
                today,
                end_date,
            )
            summary["promotions"][action] += 1

    adidas = next(product for product in products if product.brand == "Adidas")
    action = _upsert_promotion(
        db,
        STORES[2]["id"],
        adidas.id,
        "Buy 2 get 1 free",
        0.00,
        today,
        end_date,
    )
    summary["promotions"][action] += 1
    db.commit()

    return summary
