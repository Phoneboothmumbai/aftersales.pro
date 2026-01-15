# AfterSales.pro - Repair Job Lifecycle SaaS

## Original Problem Statement
Building a comprehensive SaaS Repair Job Lifecycle System for repair shops with:
- Multi-tenant architecture with subdomain-based isolation
- Job sheet creation with customer/device info, accessories checklist
- Status timeline: Received → Diagnosed → Waiting for Approval → Repaired → Closed
- WhatsApp integration via wa.me links
- PDF job sheet generation with QR code
- Admin/Technician role-based access
- Multi-branch support per shop
- Dark/Light mode with customizable branding

## Features Implemented (January 2026)

### Core Features
- ✅ Multi-tenant SaaS with subdomain isolation
- ✅ JWT-based authentication with Admin/Technician roles
- ✅ Complete job lifecycle management
- ✅ WhatsApp message generation
- ✅ PDF job sheet with QR code
- ✅ Multi-branch support
- ✅ Dark/Light theme toggle

### Photo & Tracking
- ✅ Photo upload (before/after/damage)
- ✅ Public customer tracking page (/track)
- ✅ QR code on job sheets for tracking

### Inventory & Analytics
- ✅ Inventory management (parts/spares)
- ✅ Stock adjustments with history
- ✅ Technician performance metrics
- ✅ Analytics dashboard with charts

### Customer Management
- ✅ Customers page with drill-down
- ✅ Customer → Devices → Job History view
- ✅ Repeat customer identification

### Search & UX
- ✅ **Universal Search Bar** - Searches jobs, customers, inventory across all fields
- ✅ **Keyboard shortcut** - Cmd/Ctrl+K opens search
- ✅ **Device Password field** - Store device PIN/password for diagnosis
- ✅ **Device Notes field** - Additional notes about the device

### Super Admin Portal (NEW - January 15, 2026)
- ✅ **Subscription Plans** - 4 plans: Free (₹0), Basic (₹499/mo), Pro (₹999/mo), Enterprise (₹2499/mo)
- ✅ **Manual Plan Assignment** - Super Admin can assign any plan with custom duration
- ✅ **Extend Validity** - Manually extend trial or subscription by days
- ✅ **Record Offline Payments** - Cash, UPI, Bank Transfer, Cheque, Card
- ✅ **Payment History** - Track all payments per tenant
- ✅ **Admin Action Logs** - Audit trail of all plan changes and extensions
- ✅ **Plan Features** - Each plan has max users, max jobs/month limits
- ✅ **Tabbed Tenant Modal** - Overview, Subscription, Payments, History tabs

## Navigation Structure
- Dashboard - Overview stats
- Jobs - All repair jobs with date range filter
- Customers - Customer history with device drill-down
- Inventory - Parts/spares management
- Analytics - Performance metrics
- Team - User management (Admin)
- Branches - Multi-location (Admin)
- Settings - Shop configuration

## API Endpoints

### Universal Search (NEW)
- `GET /api/search?q={query}&limit=15` - Search across jobs, customers, inventory

### Jobs
- `POST /api/jobs` - Create job (now with device.notes, device.password)
- `GET /api/jobs` - List jobs (with date_from, date_to filters)
- `GET /api/jobs/{id}` - Get job (returns device.notes, device.password)
- `PUT /api/jobs/{id}/diagnosis` - Add diagnosis
- `PUT /api/jobs/{id}/repair` - Mark repaired
- `PUT /api/jobs/{id}/close` - Close job
- `GET /api/jobs/{id}/pdf` - Generate PDF with QR
- `POST /api/jobs/{id}/photos` - Upload photo

### Customers
- `GET /api/customers` - List customers (aggregated from jobs)
- `GET /api/customers/stats` - Customer statistics
- `GET /api/customers/{mobile}/devices` - Customer's devices
- `GET /api/customers/{mobile}/devices/{serial}/history` - Device history

### Inventory
- `POST /api/inventory` - Create item
- `GET /api/inventory` - List items
- `PUT /api/inventory/{id}` - Update item
- `DELETE /api/inventory/{id}` - Delete item
- `POST /api/inventory/{id}/adjust` - Adjust stock
- `GET /api/inventory/stats` - Inventory statistics

### Metrics
- `GET /api/metrics/technicians` - Technician performance
- `GET /api/metrics/overview` - Shop overview stats

### Super Admin (NEW)
- `POST /api/super-admin/login` - Super admin login
- `GET /api/super-admin/me` - Get current super admin
- `GET /api/super-admin/stats` - Platform-wide statistics
- `GET /api/super-admin/plans` - Get subscription plans
- `GET /api/super-admin/tenants` - List all tenants with plan info
- `GET /api/super-admin/tenants/{id}` - Tenant details with payments/logs
- `PUT /api/super-admin/tenants/{id}` - Update tenant status
- `POST /api/super-admin/tenants/{id}/assign-plan` - Assign subscription plan
- `POST /api/super-admin/tenants/{id}/extend-validity` - Extend trial/subscription
- `POST /api/super-admin/tenants/{id}/record-payment` - Record offline payment
- `GET /api/super-admin/tenants/{id}/payments` - View payment history
- `GET /api/super-admin/tenants/{id}/action-logs` - View admin action logs
- `GET /api/super-admin/payments` - All recent payments across tenants

### Public
- `GET /api/public/track/{job_number}/{tracking_token}` - Public job status

## Data Models

### DeviceInfo (Updated)
```python
class DeviceInfo(BaseModel):
    device_type: str          # Laptop, Mobile, Tablet, Other
    brand: str
    model: str
    serial_imei: str
    condition: str            # Fresh, Active, Physical Damage, Dead, Liquid
    condition_notes: Optional[str]
    notes: Optional[str]      # NEW: Additional device notes
    password: Optional[str]   # NEW: Device password/PIN
```

## Deployment Status
- **Domain**: aftersales.pro (DNS configured)
- **Server**: Ubuntu at 65.20.70.245
- **Pending**: SSL certificate with Let's Encrypt

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial MVP
- `/app/test_reports/iteration_2.json` - Photo, QR, Tracking
- `/app/test_reports/iteration_3.json` - Inventory, Date filter, Metrics
- `/app/test_reports/iteration_4.json` - Customers feature
- `/app/test_reports/iteration_5.json` - Universal Search, Device fields

## Prioritized Backlog

### P1 (High Priority)
- [ ] SSL setup for aftersales.pro
- [ ] Email notifications for status updates
- [ ] AMC/repeat customer tagging

### P2 (Medium Priority)
- [ ] Invoice generation
- [ ] Export to CSV/Excel
- [ ] SMS notifications

### P3 (Nice to Have)
- [ ] Mobile app (PWA)
- [ ] WhatsApp Business API
- [ ] Payment gateway

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, react-dropzone, date-fns
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, ReportLab, qrcode
- **Database**: MongoDB
