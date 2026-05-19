# Studio 88 Backend

FastAPI backend for stores, products, stock, promotions, users, orders, payments, receipts, and warranty claims.

## Local Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Swagger docs are available at `http://127.0.0.1:8000/docs`.
