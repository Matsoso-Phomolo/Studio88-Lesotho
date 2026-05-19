from sqlalchemy import inspect, text

from app.database import engine


def add_column(table_name: str, column_name: str, definition: str) -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns(table_name)}

    if column_name in columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
        )


def repair_schema() -> None:
    add_column("stores", "manager_name", "VARCHAR(100)")
    add_column("stores", "contact_phone", "VARCHAR(30)")
    add_column("stores", "is_active", "BOOLEAN DEFAULT TRUE")
    add_column("stores", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    add_column("products", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    add_column("stock", "last_updated", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    add_column("promotions", "store_id", "INTEGER")
    add_column("promotions", "start_date", "DATE DEFAULT CURRENT_DATE")
    add_column("promotions", "end_date", "DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days')")
    add_column("promotions", "title", "VARCHAR(150)")
    add_column("promotions", "is_active", "BOOLEAN DEFAULT TRUE")
    add_column("promotions", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    add_column("payments", "payment_method", "VARCHAR(30)")
    add_column("payments", "payment_phone", "VARCHAR(30)")
    add_column("payments", "amount", "NUMERIC(10, 2) DEFAULT 0")
    add_column("payments", "provider_reference", "VARCHAR(100)")
    add_column("payments", "payment_status", "VARCHAR(30) DEFAULT 'Pending'")
    add_column("payments", "paid_at", "TIMESTAMP")
    add_column("payments", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    with engine.begin() as connection:
        connection.execute(text("UPDATE stores SET is_active = TRUE WHERE is_active IS NULL"))
        connection.execute(text("UPDATE products SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
        connection.execute(text("UPDATE stock SET last_updated = CURRENT_TIMESTAMP WHERE last_updated IS NULL"))
        connection.execute(
            text(
                """
                UPDATE promotions
                SET store_id = stock.store_id
                FROM stock
                WHERE promotions.store_id IS NULL
                  AND stock.id = (
                    SELECT s.id
                    FROM stock s
                    WHERE s.product_id = promotions.product_id
                    ORDER BY s.id
                    LIMIT 1
                  )
                """
            )
        )
        connection.execute(text("UPDATE promotions SET store_id = 1 WHERE store_id IS NULL"))
        connection.execute(text("UPDATE promotions SET start_date = CURRENT_DATE WHERE start_date IS NULL"))
        connection.execute(
            text(
                "UPDATE promotions SET end_date = CURRENT_DATE + INTERVAL '30 days' WHERE end_date IS NULL"
            )
        )
        connection.execute(text("UPDATE promotions SET title = 'Store Promotion' WHERE title IS NULL"))
        connection.execute(text("UPDATE payments SET payment_status = 'Pending' WHERE payment_status IS NULL"))
        connection.execute(text("UPDATE payments SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
        connection.execute(text("UPDATE orders SET status = 'Pending' WHERE status = 'Pending Payment'"))
        connection.execute(
            text(
                """
                UPDATE promotions
                SET is_active = COALESCE(active, TRUE)
                WHERE is_active IS NULL
                """
            )
        )


if __name__ == "__main__":
    repair_schema()
    print("Database schema repaired.")
