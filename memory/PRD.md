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

### Super Admin Portal (January 15-20, 2026)
- ✅ **Dynamic Subscription Plans** - Plans stored in MongoDB, fully CRUD-able
- ✅ **Plan Limits**: max_users, max_branches, max_jobs_per_month, max_inventory_items, max_photos_per_job, max_storage_mb
- ✅ **18 Feature Toggles**: job_management, basic_reports, pdf_job_sheet, qr_tracking, whatsapp_messages, photo_upload, inventory_management, advanced_analytics, technician_metrics, customer_management, email_notifications, sms_notifications, custom_branding, api_access, priority_support, dedicated_account_manager, data_export, multi_branch
- ✅ **Create/Edit/Delete Plans** - Super Admin can manage all plan parameters
- ✅ **Manual Plan Assignment** - Assign any plan with custom duration
- ✅ **Extend Validity** - Manually extend trial or subscription by days
- ✅ **Record Offline Payments** - Cash, UPI, Bank Transfer, Cheque, Card
- ✅ **Payment History** - Track all payments per tenant
- ✅ **Admin Action Logs** - Audit trail of all plan changes and extensions
- ✅ **Plans Tab UI** - Dedicated tab with plan cards showing all details
- ✅ **Create Shop from Super Admin** - POST /api/super-admin/tenants
- ✅ **Analytics & Billing Tab** - Revenue charts, plan distribution, expiring subscriptions
- ✅ **Enhanced Tenant Details Modal** - 6 tabs: Overview, Settings, Team, Billing, Payments, Logs

### Super Admin New Features (January 20, 2026)
- ✅ **Login as Shop (Impersonation)** - Super admin can log in as any shop to preview their dashboard
- ✅ **Impersonation Banner** - Amber banner shows when viewing as a shop with "Exit Preview" button
- ✅ **Suspend Shop** - Suspend a shop with reason, immediately blocks access
- ✅ **Unsuspend Shop** - Restore a suspended shop's access
- ✅ **Broadcast Announcements** - Create announcements targeting all/trial/paid/free shops
- ✅ **Announcement Types** - Info, Warning, Success, Error with colored badges
- ✅ **Support Tickets Tab** - View and manage support tickets from shops
- ✅ **Ticket Reply & Close** - Reply to tickets and close resolved ones
- ✅ **Enhanced Tenant Actions** - All actions (Login as Shop, Change Plan, Extend Validity, Record Payment, Suspend/Unsuspend) accessible from tenant details modal

### WhatsApp Integration (January 20, 2026)
- ✅ **Job Creation Success Modal** - Shows WhatsApp button immediately after creating a job
- ✅ **Green WhatsApp Buttons** - Prominent green buttons at every status stage:
  - Job Header: "WhatsApp Customer" button
  - Diagnosis Card: "Send WhatsApp" button
  - Approval Card: "Send WhatsApp" button
  - Repair Card: "Send WhatsApp" button
  - Delivery Card: "Send WhatsApp" button
- ✅ **Save & Send WhatsApp** - All status update modals have dual options:
  - "Save Only" - Saves without sending message
  - "Save & Send WhatsApp" (green) - Saves and opens WhatsApp with pre-filled message
- ✅ **Pre-filled WhatsApp Messages** - Professional messages for each status:
  - `received` - Device received confirmation with job details
  - `diagnosis` - Diagnosis report with cost estimate
  - `approved` - Approval confirmation
  - `repaired` - Repair completion notice
  - `delivered` - Delivery receipt with payment info
- ✅ **WhatsApp URL Generator** - Uses wa.me links with URL-encoded messages

### Plan Limit Enforcement (January 15, 2026)
- ✅ **User Limit Check** - Block adding users beyond plan limit
- ✅ **Branch Limit Check** - Block adding branches beyond plan limit (+ multi_branch feature check)
- ✅ **Job Limit Check** - Block creating jobs beyond monthly limit
- ✅ **Inventory Limit Check** - Block adding inventory items beyond limit (+ inventory_management feature check)
- ✅ **Photo Limit Check** - Block uploading photos beyond per-job limit (+ photo_upload feature check)
- ✅ **Plan Usage API** - GET /api/tenants/plan-usage returns current usage vs limits

### Legal & Compliance Pages (January 16, 2026)
- ✅ **Privacy Policy** - GDPR/CCPA compliant with safe legal language
- ✅ **Terms of Service** - Platform usage terms with liability protection
- ✅ **Refund Policy** - Subscription billing and refund terms
- ✅ **Disclaimer** - Liability limitations and data usage disclaimer
- ✅ **Editable Content** - Admins can customize all pages from Settings
- ✅ **Markdown Support** - Full markdown rendering for rich formatting
- ✅ **Enable/Disable Pages** - Toggle visibility of each page
- ✅ **Reset to Default** - One-click restore to default compliant templates

### Optional Fields & Unlock Pattern (January 21, 2026)
- ✅ **Optional IMEI/Serial Number** - Field marked "(Optional)", accepts empty value
- ✅ **Optional Device Condition** - Field marked "(Optional)", accepts empty value
- ✅ **Unlock Pattern Field** - New field for Android devices
- ✅ **Visual Pattern Grid** - 3x3 grid with dots 1-9, tap or draw to set pattern
- ✅ **Pattern Lines** - SVG lines connecting selected dots
- ✅ **Pattern Status** - Shows "Pattern: 1 → 2 → 3 → 6 → 9" format
- ✅ **Text Input Mode** - Toggle to switch between grid and text input
- ✅ **Pattern Display** - Shows pattern on job detail page in styled box

### Customer Credit/Ledger System (January 21, 2026)
- ✅ **Outstanding Balance Tracking** - Calculate and display per-customer balance
- ✅ **Outstanding Column** - Shows balance in orange badge on customer list
- ✅ **"With Outstanding" Stats** - New stats card showing count
- ✅ **Three-Dots Menu** - Customer row has View Statement and Record Payment options
- ✅ **Customer Statement Modal** - Shows Total Billed, Total Received, Outstanding
- ✅ **Transactions Table** - Lists all jobs with billed, received, credit amounts
- ✅ **Record Payment Modal** - Accept payments against outstanding balance
- ✅ **Payment Modes** - Cash, UPI, Card, Bank Transfer
- ✅ **Credit Mode Switch** - Toggle in delivery modal to mark as credit
- ✅ **Credit Alert** - Shows warning when credit mode is enabled

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
- `GET /api/customers` - List customers (with outstanding_balance field)
- `GET /api/customers/stats` - Customer statistics (includes customers_with_credit)
- `GET /api/customers/{mobile}/devices` - Customer's devices
- `GET /api/customers/{mobile}/devices/{serial}/history` - Device history
- `GET /api/customers/{mobile}/ledger` - **Customer ledger with transactions** (NEW)
- `POST /api/customers/{mobile}/payment` - **Record payment against outstanding** (NEW)

### Profit Tracking (NEW - Admin Only)
- `GET /api/settings/profit-password-status` - Check if profit password is set
- `POST /api/settings/profit-password` - Set/update profit password
- `POST /api/settings/verify-profit-password` - Verify profit password
- `GET /api/profit/summary?period={day|week|month|year}` - Profit summary
- `GET /api/profit/job-wise?date_from=&date_to=` - Job-wise profit report
- `GET /api/profit/party-wise?date_from=&date_to=` - Customer-wise profit report
- `GET /api/profit/pending-expenses` - Jobs without expense data
- `PUT /api/profit/bulk-expense` - Update expenses for multiple jobs

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

### Super Admin
- `POST /api/super-admin/login` - Super admin login
- `GET /api/super-admin/me` - Get current super admin
- `GET /api/super-admin/stats` - Platform-wide statistics
- `GET /api/super-admin/plans` - Get all subscription plans
- `GET /api/super-admin/plans/{id}` - Get single plan with tenant count
- `POST /api/super-admin/plans` - Create new subscription plan
- `PUT /api/super-admin/plans/{id}` - Update subscription plan
- `DELETE /api/super-admin/plans/{id}` - Delete subscription plan (soft delete)
- `GET /api/super-admin/feature-options` - Get all feature descriptions
- `GET /api/super-admin/tenants` - List all tenants with plan info
- `POST /api/super-admin/tenants` - Create new tenant/shop from Super Admin
- `GET /api/super-admin/tenants/{id}` - Tenant details with payments/logs
- `PUT /api/super-admin/tenants/{id}` - Update tenant status
- `POST /api/super-admin/tenants/{id}/assign-plan` - Assign subscription plan
- `POST /api/super-admin/tenants/{id}/extend-validity` - Extend trial/subscription
- `POST /api/super-admin/tenants/{id}/record-payment` - Record offline payment
- `POST /api/super-admin/tenants/{id}/impersonate` - **Login as Shop (get impersonation token)** (NEW)
- `POST /api/super-admin/tenants/{id}/suspend` - **Suspend shop with reason** (NEW)
- `POST /api/super-admin/tenants/{id}/unsuspend` - **Unsuspend shop** (NEW)
- `GET /api/super-admin/tenants/{id}/payments` - View payment history
- `GET /api/super-admin/tenants/{id}/action-logs` - View admin action logs
- `GET /api/super-admin/payments` - All recent payments across tenants
- `GET /api/super-admin/analytics` - Platform-wide analytics & billing
- `GET /api/super-admin/legal-pages` - Get all legal pages
- `PUT /api/super-admin/legal-pages/{slug}` - Update legal page content
- `GET /api/super-admin/announcements` - **List all announcements** (NEW)
- `POST /api/super-admin/announcements` - **Create announcement** (NEW)
- `DELETE /api/super-admin/announcements/{id}` - **Delete announcement** (NEW)
- `GET /api/super-admin/tickets` - **List all support tickets** (NEW)
- `POST /api/super-admin/tickets/{id}/reply` - **Reply to ticket** (NEW)
- `POST /api/super-admin/tickets/{id}/close` - **Close ticket** (NEW)

### Public
- `GET /api/public/track/{job_number}/{tracking_token}` - Public job status

## Data Models

### DeviceInfo (Updated - January 21, 2026)
```python
class DeviceInfo(BaseModel):
    device_type: str          # Laptop, Mobile, Tablet, Other
    brand: str
    model: str
    serial_imei: Optional[str]     # OPTIONAL - Can be empty
    condition: Optional[str]       # OPTIONAL - Fresh, Active, Physical Damage, Dead, Liquid
    condition_notes: Optional[str]
    notes: Optional[str]           # Additional device notes
    password: Optional[str]        # Device password/PIN
    unlock_pattern: Optional[str]  # NEW: Android unlock pattern (e.g., "1-2-3-6-9")
```

### Customer Credit/Ledger System (January 21, 2026)
- ✅ **Outstanding Balance Tracking** - Track unpaid amounts per customer
- ✅ **Customer Ledger Modal** - Shows Total Billed, Total Received, Outstanding
- ✅ **Transactions Table** - View all jobs with billed, received, and credit amounts
- ✅ **Record Payment Modal** - Accept full/partial payments against outstanding balance
- ✅ **Credit Mode in Delivery** - Toggle switch to mark delivery as credit
- ✅ **"With Outstanding" Stats** - Stats card showing customers with pending payments
- ✅ **View Statement** - Three-dots menu option to view customer statement
- ✅ **Ledger API** - GET /api/customers/{mobile}/ledger

### Profit Tracking System (January 21, 2026)
- ✅ **Password Protected Access** - Separate password for profit section (Admin only)
- ✅ **Expense Fields in Delivery** - Optional Parts Cost and Labor Cost fields
- ✅ **Estimated Profit Preview** - Shows profit calculation when expenses entered
- ✅ **Profit Summary Dashboard** - Total Received, Total Expense, Net Profit, Profit Margin
- ✅ **Period Selector** - Filter by Day, Week, Month, Year
- ✅ **Job-wise Profit Report** - Profit per job with date filters
- ✅ **Party-wise Profit Report** - Profit per customer aggregation
- ✅ **Bulk Expense Entry** - Tabular format to add expenses for multiple jobs at once
- ✅ **Pending Expense Badge** - Shows count of jobs without expense data
- ✅ **Change Password & Lock** - Security controls in header

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
- `/app/test_reports/iteration_6.json` - Super Admin Subscription Management (31 tests)
- `/app/test_reports/iteration_7.json` - Dynamic Plan Management (32 tests)
- `/app/test_reports/iteration_9.json` - Super Admin New Features
- `/app/test_reports/iteration_10.json` - Optional Fields, Unlock Pattern, Customer Ledger (17 tests)
- `/app/test_reports/iteration_11.json` - Profit Tracking System (16 tests)

## Prioritized Backlog

### P0 (Verified - Done)
- [x] Super Admin subscription management
- [x] Dynamic plan creation with all parameters (users, branches, jobs, inventory, photos, storage, 18 features)
- [x] Plan limit enforcement on all create endpoints
- [x] Optional IMEI/Serial and Device Condition fields
- [x] Unlock Pattern field (visual grid + text)
- [x] Customer Credit/Ledger System
- [x] Profit Tracking System (password protected, job-wise, party-wise, bulk expense)

### P1 (High Priority)
- [ ] Multi-language Support (i18n)
- [ ] WhatsApp alerts for expiring subscriptions
- [ ] Plan usage progress bars in tenant dashboard
- [ ] SSL setup for aftersales.pro
- [ ] Email notifications for status updates
- [ ] AMC/repeat customer tagging

### P2 (Medium Priority)
- [ ] Revenue forecasting
- [ ] Churn report analytics
- [ ] Invoice generation
- [ ] Export to CSV/Excel
- [ ] SMS notifications

### P3 (Nice to Have)
- [ ] Refactor server.py into modular routers
- [ ] Refactor SuperAdminDashboard.js (3500+ lines)
- [ ] Dockerize the application
- [ ] Mobile app (PWA)
- [ ] WhatsApp Business API
- [ ] Payment gateway

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, react-dropzone, date-fns
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, ReportLab, qrcode
- **Database**: MongoDB
