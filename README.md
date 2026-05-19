# Studio 88 Lesotho

Professional retail management and branch operations platform for Studio 88 Lesotho.

## Features

- Role-separated dashboards
- Executive analytics
- Branch management
- Customer shopping experience
- JWT authentication
- Secure checkout
- Stripe integration
- M-Pesa support
- EcoCash support
- Bank card payments
- Order lifecycle management
- Receipt generation
- Warranty validation
- Promotions and stock visibility
- Low-stock monitoring
- Retail analytics endpoints
- Rule-based AI stock recommendations
- Notifications panel
- Audit logs
- Barcode foundation

## Tech Stack

Frontend:

- React
- Vite
- Recharts

Backend:

- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT Authentication

Payments:

- Stripe
- M-Pesa
- EcoCash
- Bank Card

Deployment:

- Frontend -> Vercel
- Backend -> Render

## Screenshots

- Login page - screenshot placeholder
- Executive dashboard - screenshot placeholder
- Manager dashboard - screenshot placeholder
- Customer dashboard - screenshot placeholder
- Checkout page - screenshot placeholder

## Local Development

Backend:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Environment variables:

- Backend: `DATABASE_URL`, `JWT_SECRET_KEY`, `STRIPE_SECRET_KEY`, `FRONTEND_ORIGIN`
- Frontend: `VITE_API_BASE_URL`

Seed local data:

```powershell
cd backend
python seed_initial_retail_data.py
python seed_stakeholder_users.py
```

## Deployment

Render backend:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
- Health check: `/health`

Vercel frontend:

- Root directory: `frontend`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Production environment variables:

- Render: `DATABASE_URL`, `JWT_SECRET_KEY`, `STRIPE_SECRET_KEY`, `FRONTEND_ORIGIN`
- Vercel: `VITE_API_BASE_URL`

## Phase 3: Retail Intelligence + AI Layer

Phase 3 upgrades the system into a Retail Operations Intelligence Platform.

Analytics:

- Executive overview metrics for revenue, orders, stock, products, and promotions.
- Branch-level performance summaries.
- Product movement reporting.
- Low-stock intelligence.

AI stock recommendations:

- `0` quantity -> Restock immediately.
- `<= 5` quantity -> Low stock: reorder soon.
- High order movement -> High demand product.
- Low movement with high stock -> Consider promotion.

Notifications:

- Low stock and out-of-stock alerts.
- New order notifications.
- Order ready for collection notifications.
- Warranty request notifications.

Audit logs:

- Login tracking.
- Order creation.
- Payment confirmation.
- Order status updates.
- Stock updates.
- Promotion creation.
- Warranty status updates.

Barcode foundation:

- Products support an optional barcode.
- Missing values can be generated as `ST88-PRODUCTID`.
- Developer tools include barcode management.

Realtime readiness:

- Backend and frontend placeholders are included for future live stock, order, and notification updates.

## Security

- JWT authentication protects operational routes.
- Role-based access control separates executive, developer, manager, and customer views.
- Manager branch isolation prevents managers from viewing or updating other branches.
- Payment flows do not store card numbers, CVVs, mobile money PINs, or bank details.

## License

Educational / Portfolio use.
