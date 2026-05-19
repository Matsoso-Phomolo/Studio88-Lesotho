# Studio 88 Lesotho System

Operational retail system for Studio 88 Lesotho with role-separated dashboards, branch stock, orders, checkout, payments, receipts, warranty support, and stakeholder authentication.

## Run Locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the frontend at `http://localhost:5173`.

## Default Stakeholders

Seed the database before logging in:

```powershell
cd backend
python seed_initial_retail_data.py
python seed_stakeholder_users.py
```

Main accounts use `admin123` during local development:

- Executive: `puleng.executive@studio88.co.ls`
- Developer: `matsoso.dev@studio88.co.ls`
- Managers: `firstname.manager@studio88.co.ls`

## Notes

- Orders are not refundable.
- Warranty applies according to store policy.
- Receipt is required for warranty claims.
- Stripe support is test-mode only and requires Stripe environment variables.
