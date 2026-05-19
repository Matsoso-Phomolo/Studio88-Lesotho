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

## Security

- JWT authentication protects operational routes.
- Role-based access control separates executive, developer, manager, and customer views.
- Manager branch isolation prevents managers from viewing or updating other branches.
- Payment flows do not store card numbers, CVVs, mobile money PINs, or bank details.

## License

Educational / Portfolio use.
