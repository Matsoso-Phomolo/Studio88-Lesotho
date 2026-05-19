from collections import Counter
from typing import Optional

from sqlalchemy.orm import Session

from app import models


def build_stock_recommendations(db: Session, store_id: Optional[int] = None) -> list[dict]:
    stock_query = db.query(models.Stock)
    if store_id is not None:
        stock_query = stock_query.filter(models.Stock.store_id == store_id)

    stock_items = stock_query.all()
    order_items = db.query(models.OrderItem).all()
    ordered_units_by_product = Counter()

    for item in order_items:
        ordered_units_by_product[item.product_id] += item.quantity or 0

    recommendations = []
    for stock in stock_items:
        product = db.query(models.Product).filter(models.Product.id == stock.product_id).first()
        store = db.query(models.Store).filter(models.Store.id == stock.store_id).first()
        ordered_units = ordered_units_by_product.get(stock.product_id, 0)
        quantity = stock.quantity or 0

        if quantity == 0:
            recommendation = "Restock immediately"
            severity = "critical"
        elif quantity <= 5:
            recommendation = "Low stock: reorder soon"
            severity = "warning"
        elif ordered_units >= 5:
            recommendation = "High demand product"
            severity = "success"
        elif ordered_units <= 1 and quantity >= 15:
            recommendation = "Consider promotion"
            severity = "info"
        else:
            recommendation = "Stock level healthy"
            severity = "normal"

        recommendations.append(
            {
                "stock_id": stock.id,
                "store_id": stock.store_id,
                "store_name": store.name if store else "Unknown Store",
                "product_id": stock.product_id,
                "product_name": product.name if product else "Unknown Product",
                "brand": product.brand if product else "",
                "quantity": quantity,
                "ordered_units": ordered_units,
                "recommendation": recommendation,
                "severity": severity,
            }
        )

    severity_order = {"critical": 0, "warning": 1, "success": 2, "info": 3, "normal": 4}
    return sorted(recommendations, key=lambda item: (severity_order.get(item["severity"], 9), item["quantity"]))
