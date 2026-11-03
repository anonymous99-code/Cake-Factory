# Cake Factory

Online shop and business manager for Cake Factory: daily snack sales, advance orders,
catering and event-planning inquiries, payment records, stock and reports.

```
CakeFactory/
├── Backend/    Django + Django REST Framework API (JWT login)
└── Frontend/   React + Vite + Tailwind website and admin dashboard
```

## 1. Put it into your existing project (Windows PowerShell)

Your project is at `C:\Users\ADMIN\CakeFactory`. This zip is a **drop-in update**. It does not contain
your `venv`, `db.sqlite3` or `media` folder, so those stay exactly as they are.

1. **Back up first**: copy `C:\Users\ADMIN\CakeFactory` to another folder.
2. Copy the contents of this zip's `Backend\` over your `Backend\` folder (choose overwrite).
   Note: `config\settings.py` and `config\urls.py` are replaced (settings now read an optional `.env` file).
3. Copy this zip's `Frontend\` folder next to `Backend\`.

### Backend terminal

```powershell
cd C:\Users\ADMIN\CakeFactory\Backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py changepassword YOUR_ADMIN_USERNAME     # the old password was exposed, so change it
python manage.py test                                   # should finish with OK
python manage.py runserver
```

Optional: `python manage.py seed_demo_products` adds a few sample products so you can see the design.
Edit or remove them in the admin dashboard afterwards.

### Frontend terminal (a separate PowerShell window)

```powershell
cd C:\Users\ADMIN\CakeFactory\Frontend
npm install
npm run dev
```

Open http://localhost:5173 for the shop and http://localhost:5173/admin/login for the owner login.
The admin account must be a **staff** user (accounts made with `createsuperuser` are).

## 2. First-time setup for the owner

Sign in at `/admin/login`, open **Settings** and fill in: WhatsApp number (WhatsApp buttons stay hidden
until you do), phone, address, Google Maps link, opening hours, delivery fee / free-delivery amount / policy,
and the About text. Then add products (with photos and today's stock) on **Products**.

## 3. What was built

**Backend rules (enforced by the server, not by hiding buttons)**
- Orders: repeated product lines are combined; stock is checked and deducted inside a locked transaction;
  past dates and dates too far ahead are rejected; the delivery fee comes from Settings (with an optional free-delivery threshold).
- Same-day orders reserve the product's daily stock. **Advance orders** (a future date) reserve from the quantity
  scheduled for that date on the Availability page, so the same stock cannot be sold twice. A date with nothing
  scheduled cannot be booked. Advance orders start as Pending so you can review them before confirming.
- Status flow is validated: Pending, Confirmed, Preparing, Ready, (Out for delivery), Completed. Cancelling is allowed
  until completion. Pickup orders cannot go "out for delivery"; delivery orders must.
- Cancelling returns reserved stock exactly once.
- Payments and refunds are stored as records, and the **payment status is calculated from them**. A client can never
  just say "paid". Overpayment, over-refunding and duplicate references are rejected.
- Catering and event inquiries: NEW, CONTACTED, QUOTATION_SENT, then ACCEPTED or DECLINED. A quoted price is required
  before "quotation sent". Accepting creates the booking (agreed price, deposit, balance).
- Products that appear on past orders are never erased: "delete" hides them from the shop.
- Public endpoints are rate limited (orders, inquiries, login). Customers can see only their own order, via its private link.
- Dashboard numbers come from real records. Order value, money received, refunds, outstanding balances and expenses are kept
  separate. Estimated profit = money received minus refunds minus the expenses you entered (orders only).

**Frontend**
- Public: Home, Menu (search and filter), Product details, Cart, Checkout (pickup or delivery, date and time, availability check for
  advance orders), Order page with live progress, Catering, Event planning, About, Contact, floating WhatsApp button.
- Admin: Dashboard, Orders (status buttons, payments and refunds), Products (photo upload, quick stock), Availability, Catering,
  Event planning, Customers, Payments, Reports (chart and expenses), Settings.

## 4. Main API endpoints

| Area | Endpoint |
|---|---|
| Login | `POST /api/auth/token/`, `POST /api/auth/token/refresh/`, `GET /api/auth/me/` |
| Shop | `GET /api/products/`, `POST /api/orders/`, `GET /api/orders/track/<order_number>/`, `GET /api/availability/?date=`, `GET /api/settings/` |
| Inquiries | `POST /api/catering/inquiries/` |
| Admin orders | `GET /api/orders/all/`, `PATCH /api/orders/<id>/status/`, `POST /api/orders/<id>/payments/`, `GET /api/orders/payments/` |
| Admin catering | `GET /api/catering/inquiries/all/`, `PATCH .../<id>/`, `PATCH .../<id>/status/`, `POST .../<id>/accept/`, `GET`/`PATCH /api/catering/bookings/` |
| Admin other | `/api/availability/manage/`, `/api/dashboard/summary/`, `/revenue/`, `/customers/`, `/expenses/`, `/settings/` |

## 5. Before going live (deliberately not done for you)

- **Payment gateway**: not built. Recording cash, transfer and POS payments works now. Add Paystack or Flutterwave next, with the
  server verifying every transaction reference (never trust the browser). Check their current fees and requirements first.
- **Hosting**: pick and price a frontend host (for example Vercel; `vercel.json` is included), a Python host for Django, managed
  PostgreSQL, and **persistent storage for uploaded photos** (a host's local disk is usually wiped on redeploy, so use object storage).
  Check each service's current limits and pricing before committing.
- Production environment variables (see `Backend/.env.example`): `DJANGO_DEBUG=False`, a long random `DJANGO_SECRET_KEY`,
  `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` (your real site address), `CSRF_TRUSTED_ORIGINS`, and the `DB_*` PostgreSQL values.
  Frontend: `VITE_API_URL=https://your-api-domain/api`.
- Run `python manage.py collectstatic`, serve with `gunicorn config.wsgi`, use HTTPS, take database backups and test restoring one.
- Login tokens are kept in the browser's local storage. That is a common trade-off for this setup, so only sign in on trusted devices
  and use a strong password.
- Every user created with the current `accounts.User` model gets `role=ADMIN` by default. Only `is_staff` users can use the admin API,
  but review the role field before adding other staff accounts.
- The interface compiles and the API is covered by 40 automated tests, but the screens have not been clicked through in a browser by me.
  Please check every page on a phone and a computer before relying on it.
