# Studio 88 Lesotho - Local Setup

Detailed internal setup and operational guide for running the Studio 88 Lesotho system locally and preparing it for production deployment.

## Project Structure

- `backend/` - FastAPI API, SQLAlchemy models, seed scripts, payment logic, JWT authentication, order lifecycle, stock, promotions, warranty, and Render configuration.
- `frontend/` - React/Vite application, Studio 88 dark UI, dashboards, checkout flow, receipts, and Vercel configuration.
- `docs/` - Supporting project documentation and screenshot placeholders.
- `mobile/` - Reserved mobile project area from the original repository structure.

## Backend Setup

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://127.0.0.1:5173
```

## Environment Variables

Backend:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/studio88_lesotho
JWT_SECRET_KEY=change-this-secret-key
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_ORIGIN=http://localhost:5173
```

Frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Create `backend/.env` from `backend/.env.example` and `frontend/.env` from `frontend/.env.example` for local development.

## Local Ports

Backend:

```text
http://127.0.0.1:8000
```

Frontend:

```text
http://127.0.0.1:5173
```

## Default Test Accounts

All seeded accounts use:

```text
admin123
```

Executive:

```text
puleng.executive@studio88.co.ls
```

Developer:

```text
matsoso.dev@studio88.co.ls
matsoso.it@studio88.co.ls
```

Managers:

```text
letlotlo.manager@studio88.co.ls    Kingsway Mall, store_id=1
nthati.manager@studio88.co.ls      Lepoqong Mall, store_id=2
atlehang.manager@studio88.co.ls    Pioneer Mall, store_id=3
ndeye.manager@studio88.co.ls       Maseru Mall, store_id=4
limpho.manager@studio88.co.ls      Mafeteng, store_id=5
khosi.manager@studio88.co.ls       Maputsoe, store_id=6
senate.manager@studio88.co.ls      Matsoso Mall, store_id=7
```

Seed the database:

```powershell
cd backend
python seed_initial_retail_data.py
python seed_stakeholder_users.py
```

## Order Lifecycle

- Pending
- Confirmed
- Ready for Collection
- Collected
- Cancelled

Rules:

- Paid orders cannot be cancelled.
- No refunds.
- Warranty requires a valid receipt.
- Managers can only view and update orders from their assigned branch.

## Payment Methods

M-Pesa:

- Simulated mobile money payment.
- Requires payment phone.
- Stores transaction reference and paid status only.

EcoCash:

- Simulated mobile money payment.
- Requires payment phone.
- Stores transaction reference and paid status only.

Bank Card:

- Simulated secure card flow.
- No card numbers, CVVs, or bank details are collected or stored.

Stripe:

- Uses Stripe Checkout in test mode when `STRIPE_SECRET_KEY` is configured.
- Stripe handles card details securely.
- Webhook endpoint: `/payments/stripe/webhook`

## Deployment

Render backend:

1. Connect the GitHub repository.
2. Set root directory to `backend`.
3. Use build command:

```bash
pip install -r requirements.txt
```

4. Use start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 10000
```

5. Add environment variables:

```env
DATABASE_URL=
JWT_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
```

Vercel frontend:

1. Connect the same GitHub repository.
2. Set root directory to `frontend`.
3. Select Vite as the framework.
4. Add environment variable:

```env
VITE_API_BASE_URL=https://YOUR-RENDER-BACKEND.onrender.com
```

5. Deploy.

## Troubleshooting

Port conflicts:

- If port `8000` is busy, stop the existing backend process or run Uvicorn on another port and update `VITE_API_BASE_URL`.
- If port `5173` is busy, Vite may choose another local port. Add that origin to `FRONTEND_ORIGIN` for backend CORS during local testing.

CORS issues:

- Confirm `FRONTEND_ORIGIN` exactly matches the frontend origin, including `https://`.
- For local testing, use `http://localhost:5173` or `http://127.0.0.1:5173`.

Localhost API issues:

- The frontend reads `VITE_API_BASE_URL`.
- Create `frontend/.env` and restart the Vite dev server after changing it.

Vercel environment issues:

- Add `VITE_API_BASE_URL` in Vercel project settings.
- Redeploy after changing environment variables.

Render cold start:

- Free Render services may sleep after inactivity.
- The first request can take extra time while the backend wakes up.
