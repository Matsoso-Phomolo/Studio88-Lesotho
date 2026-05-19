import json
from datetime import date, timedelta

from sqlalchemy.orm import selectinload

from app import crud, models, schemas
from app.database import SessionLocal, Base, engine
from app.services.stock_service import calculate_stock_status
from repair_database_schema import repair_schema


STORES = [
    {"id": 1, "name": "Kingsway Mall", "location": "Maseru"},
    {"id": 2, "name": "Lepoqong Mall", "location": "Maseru"},
    {"id": 3, "name": "Pioneer Mall", "location": "Maseru"},
    {"id": 4, "name": "Maseru Mall", "location": "Maseru"},
    {"id": 5, "name": "Mafeteng", "location": "Mafeteng"},
    {"id": 6, "name": "Maputsoe", "location": "Maputsoe"},
    {"id": 7, "name": "Matsoso Mall", "location": "Maseru"},
]

PRODUCTS = [
    {
        "name": "Nike Air Max 90",
        "brand": "Nike",
        "price": 1999.00,
        "color": "Black",
        "image_url": "/images/nike_air_max_90_black.jpg",
        "is_new": True,
    },
    {
        "name": "Nike Air Force 1",
        "brand": "Nike",
        "price": 1899.00,
        "color": "White",
        "image_url": "/images/nike_air_force_1_white.jpg",
        "is_new": False,
    },
    {
        "name": "Adidas Ultraboost",
        "brand": "Adidas",
        "price": 2299.00,
        "color": "Black/White",
        "image_url": "/images/adidas_ultraboost.jpg",
        "is_new": True,
    },
    {
        "name": "Puma RS-X",
        "brand": "Puma",
        "price": 1599.00,
        "color": "Multi",
        "image_url": "/images/puma_rsx.jpg",
        "is_new": True,
    },
    {
        "name": "New Balance 550",
        "brand": "New Balance",
        "price": 1799.00,
        "color": "White/Green",
        "image_url": "/images/new_balance_550.jpg",
        "is_new": True,
    },
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


def upsert_store(db, store_data):
    store = db.query(models.Store).filter(models.Store.id == store_data["id"]).first()

    if store:
        store.name = store_data["name"]
        store.location = store_data["location"]
        store.is_active = True
        db.commit()
        db.refresh(store)
        return store

    store = models.Store(**store_data, is_active=True)
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


def upsert_product(db, product_data):
    color = product_data["color"]
    product = (
        db.query(models.Product)
        .options(selectinload(models.Product.colours))
        .filter(models.Product.name == product_data["name"])
        .first()
    )

    data = {
        "name": product_data["name"],
        "brand": product_data["brand"],
        "category": "Sneakers",
        "description": f"{product_data['brand']} Studio 88 sneaker in {color}.",
        "price": product_data["price"],
        "image_url": product_data["image_url"],
        "is_new": product_data["is_new"],
    }

    if product:
        for key, value in data.items():
            setattr(product, key, value)
        db.commit()
        db.refresh(product)
    else:
        product = crud.create_product(db, schemas.ProductCreate(**data, color=color))

    colour = (
        db.query(models.ProductColour)
        .filter(models.ProductColour.product_id == product.id)
        .first()
    )

    if colour:
        colour.colour_name = color
    else:
        db.add(models.ProductColour(product_id=product.id, colour_name=color))

    db.commit()
    db.refresh(product)
    return product


def upsert_promotion(db, store_id, product_id, discount_percent, title, start_date, end_date):
    promotion = (
        db.query(models.Promotion)
        .filter(
            models.Promotion.store_id == store_id,
            models.Promotion.product_id == product_id,
            models.Promotion.title == title,
        )
        .first()
    )

    if promotion:
        promotion.discount_percent = discount_percent
        promotion.start_date = start_date
        promotion.end_date = end_date
        promotion.is_active = True
    else:
        promotion = models.Promotion(
            store_id=store_id,
            product_id=product_id,
            discount_percent=discount_percent,
            start_date=start_date,
            end_date=end_date,
            title=title,
            is_active=True,
        )
        db.add(promotion)

    db.commit()
    db.refresh(promotion)
    return promotion


def seed_initial_retail_data():
    Base.metadata.create_all(bind=engine)
    repair_schema()

    db = SessionLocal()
    try:
        stores = [upsert_store(db, store) for store in STORES]
        products = [upsert_product(db, product) for product in PRODUCTS]

        stock_items = []
        for store_index, store in enumerate(stores):
            for product_index, product in enumerate(products):
                quantity = STOCK_QUANTITIES[store_index][product_index]
                stock = crud.create_or_update_stock(
                    db,
                    schemas.StockCreate(
                        store_id=store.id,
                        product_id=product.id,
                        quantity=quantity,
                    ),
                )
                stock.status = calculate_stock_status(quantity)
                stock_items.append(stock)

        today = date.today()
        end_date = today + timedelta(days=30)
        promotions = []

        nike_products = [product for product in products if product.brand == "Nike"]
        for store in stores[:4]:
            for product in nike_products:
                promotions.append(
                    upsert_promotion(
                        db,
                        store.id,
                        product.id,
                        10.00,
                        "10% discount on Nike",
                        today,
                        end_date,
                    )
                )

        adidas = next(product for product in products if product.brand == "Adidas")
        promotions.append(
            upsert_promotion(
                db,
                stores[2].id,
                adidas.id,
                0.00,
                "Buy 2 get 1 free",
                today,
                end_date,
            )
        )

        return {
            "stores": [{"id": store.id, "name": store.name} for store in stores],
            "products": [
                {
                    "id": product.id,
                    "name": product.name,
                    "brand": product.brand,
                    "price": float(product.price),
                    "color": product.color,
                }
                for product in products
            ],
            "stock_count": len(stock_items),
            "promotion_count": len(promotions),
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(json.dumps(seed_initial_retail_data(), indent=2))
