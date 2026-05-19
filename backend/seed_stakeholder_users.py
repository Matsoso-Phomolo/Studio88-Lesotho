import json

from sqlalchemy import inspect, text

from app import crud, models, schemas
from app.database import SessionLocal, engine
from app.utils.security import hash_password, verify_password


DEFAULT_PASSWORD = "admin123"

STAKEHOLDER_USERS = [
    {
        "full_name": "Puleng Nkole",
        "email": "puleng.executive@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "ADMIN",
        "store_id": None,
    },
    {
        "full_name": "Letlotlo Mandoza",
        "email": "letlotlo.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 1,
    },
    {
        "full_name": "Nthati Rampobole",
        "email": "nthati.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 2,
    },
    {
        "full_name": "Atlehang Hlatsi",
        "email": "atlehang.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 3,
    },
    {
        "full_name": "Ndeye Mohapi",
        "email": "ndeye.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 4,
    },
    {
        "full_name": "Limpho Moeti",
        "email": "limpho.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 5,
    },
    {
        "full_name": "Khosi Machake",
        "email": "khosi.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 6,
    },
    {
        "full_name": "Senate Matsoso",
        "email": "senate.manager@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "MANAGER",
        "store_id": 7,
    },
    {
        "full_name": "Matsoso Phomolo",
        "email": "matsoso.dev@studio88.co.ls",
        "password": DEFAULT_PASSWORD,
        "role": "DEVELOPER",
        "store_id": None,
    },
]


def ensure_users_table_shape() -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    if "created_at" not in user_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            )


def has_requested_password(password_hash: str) -> bool:
    try:
        return verify_password(DEFAULT_PASSWORD, password_hash)
    except ValueError:
        return False


def serialize_user(user: models.User, action: str) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "store_id": user.store_id,
        "is_active": user.is_active,
        "password_hashed": user.password_hash != DEFAULT_PASSWORD
        and has_requested_password(user.password_hash),
        "action": action,
    }


def seed_stakeholder_users() -> list[dict]:
    ensure_users_table_shape()

    db = SessionLocal()
    users = []

    try:
        for user_data in STAKEHOLDER_USERS:
            existing_user = (
                db.query(models.User)
                .filter(models.User.email == user_data["email"])
                .first()
            )

            if existing_user:
                existing_user.full_name = user_data["full_name"]
                existing_user.role = user_data["role"]
                existing_user.store_id = user_data["store_id"]
                existing_user.is_active = True

                if not has_requested_password(existing_user.password_hash):
                    existing_user.password_hash = hash_password(DEFAULT_PASSWORD)

                db.commit()
                db.refresh(existing_user)
                users.append(serialize_user(existing_user, "updated"))
                continue

            created_user = crud.create_user(db, schemas.UserCreate(**user_data))
            users.append(serialize_user(created_user, "created"))

        return users
    finally:
        db.close()


if __name__ == "__main__":
    print(json.dumps(seed_stakeholder_users(), indent=2))
