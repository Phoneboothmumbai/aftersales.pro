# AfterSales.pro - Repair Job Lifecycle SaaS

## Original Problem Statement
Building a comprehensive SaaS Repair Job Lifecycle System for repair shops with:
- Multi-tenant architecture with subdomain-based isolation (shop.aftersales.pro)
- Job sheet creation with customer/device info, accessories checklist
- Status timeline: Received → Diagnosed → Waiting for Approval → Repaired → Closed
- WhatsApp integration via wa.me links (no API required)
- PDF job sheet generation with QR code
- Admin/Technician role-based access
- Multi-branch support per shop
- Dark/Light mode with customizable branding

## User Personas
1. **Shop Owner/Admin**: Creates tenant, manages team, branches, settings, inventory
2. **Technician**: Creates jobs, adds diagnosis, marks repairs complete, adjusts stock
3. **Customer**: Receives WhatsApp updates, can track job status via public link

## Core Requirements (Static)
- [x] Multi-tenant SaaS with subdomain isolation
- [x] JWT-based authentication with Admin/Technician roles
- [x] Signup flow with subdomain validation and 14-day trial
- [x] Complete job lifecycle management
- [x] Accessories checklist with custom items
- [x] Status timeline with audit trail
- [x] WhatsApp message generation (wa.me links)
- [x] PDF job sheet generation with QR code
- [x] Multi-branch support
- [x] Dark/Light theme toggle
- [x] Photo upload for device condition proof
- [x] Public customer tracking page
- [x] Inventory management (parts/spares)
- [x] Date range filter on jobs
- [x] Technician performance metrics

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- Complete REST API with 35+ endpoints
- Tenant management (signup, settings, subdomain check)
- User management (CRUD, role-based access)
- Branch management (CRUD)
- Job management (full lifecycle)
- PDF generation with QR code using ReportLab + qrcode
- WhatsApp message generation
- Photo upload system (before/after/damage types)
- Public tracking endpoint (no auth required)
- **Inventory management** (CRUD, stock adjustments, categories, stats)
- **Technician metrics** (jobs created, jobs closed, avg repair time)
- **Shop overview metrics** (weekly/monthly stats, revenue, trend)
- Super Admin panel endpoints

### Frontend (React + Tailwind + Shadcn)
- Landing page with features, pricing sections
- Signup flow with 2-step wizard
- Login with subdomain validation
- Dashboard with stats and quick actions
- Jobs list with filters, search, **date range filter**
- Job creation form with all fields
- Job detail view with status timeline
- Device Photos section with drag & drop upload
- Customer Tracking card with copy link/preview buttons
- Diagnosis, Repair, and Closure modals
- Team management (Admin only)
- Branch management (Admin only)
- Settings with theme toggle
- **Inventory page** with CRUD, stock adjustments, filters
- **Analytics page** with charts, metrics, technician performance
- Super Admin login & dashboard
- Public tracking page at /track

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- ✅ Multi-tenant architecture
- ✅ Authentication system
- ✅ Job CRUD operations
- ✅ Status workflow

### P1 (High Priority) - DONE ✅
- ✅ Customer status page (read-only public link)
- ✅ Photo upload for device condition
- ✅ QR code on job sheets
- ✅ Date range filter on jobs
- ✅ Inventory management
- ✅ Technician performance metrics
- [ ] Email notifications (pending)

### P2 (Medium Priority) - Future
- [ ] AMC/repeat customer tagging
- [ ] Invoice generation
- [ ] Export data to CSV/Excel

### P3 (Nice to Have)
- [ ] Mobile app (PWA)
- [ ] WhatsApp Business API integration
- [ ] Payment gateway integration
- [ ] Multi-language support (Hindi)

## Next Tasks
1. **Domain & SSL setup** - Connect aftersales.pro domain with wildcard SSL
2. Email notifications for status updates
3. AMC/repeat customer tagging

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router, react-dropzone, date-fns
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, ReportLab, qrcode, aiofiles
- **Database**: MongoDB
- **Authentication**: JWT with bcrypt password hashing

## API Endpoints (Complete List)

### Auth & Users
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/users` - Create user (Admin)
- `GET /api/users` - List users
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Tenants & Settings
- `POST /api/tenants/signup` - Create tenant
- `GET /api/tenants/check-subdomain` - Check availability
- `GET /api/settings` - Get tenant settings
- `PUT /api/settings` - Update settings

### Jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs` - List jobs (with status_filter, branch_id, search, date_from, date_to)
- `GET /api/jobs/{id}` - Get job
- `PUT /api/jobs/{id}/diagnosis` - Add diagnosis
- `PUT /api/jobs/{id}/approve` - Customer approval
- `PUT /api/jobs/{id}/repair` - Mark repaired
- `PUT /api/jobs/{id}/close` - Close job
- `GET /api/jobs/{id}/pdf` - Generate PDF with QR
- `GET /api/jobs/{id}/whatsapp` - Get WhatsApp link
- `GET /api/jobs/{id}/tracking-link` - Get public tracking link
- `POST /api/jobs/{id}/photos` - Upload photo
- `DELETE /api/jobs/{id}/photos/{photo_id}` - Delete photo
- `GET /api/jobs/stats` - Job statistics

### Inventory
- `POST /api/inventory` - Create item (Admin)
- `GET /api/inventory` - List items (with category, low_stock_only, search)
- `GET /api/inventory/{id}` - Get item
- `PUT /api/inventory/{id}` - Update item (Admin)
- `DELETE /api/inventory/{id}` - Delete item (Admin)
- `POST /api/inventory/{id}/adjust` - Adjust stock
- `GET /api/inventory/stats` - Inventory statistics
- `GET /api/inventory/categories` - Get categories

### Metrics
- `GET /api/metrics/technicians` - Technician performance
- `GET /api/metrics/overview` - Shop overview stats

### Public
- `GET /api/public/track/{job_number}/{tracking_token}` - Public job status

### Branches
- `POST /api/branches` - Create branch
- `GET /api/branches` - List branches
- `PUT /api/branches/{id}` - Update branch
- `DELETE /api/branches/{id}` - Delete branch

## Database Schema

### Collections
- **tenants**: {id, company_name, subdomain, trial_ends_at, is_active, subscription_status, settings}
- **users**: {id, tenant_id, name, email, password, role, branch_id}
- **jobs**: {id, tenant_id, job_number, customer, device, accessories, problem_description, status, diagnosis, repair, closure, photos, tracking_token, status_history, created_at}
- **branches**: {id, tenant_id, name, address, phone, is_default}
- **inventory**: {id, tenant_id, name, sku, category, quantity, min_stock_level, cost_price, selling_price, supplier, description, stock_history, created_at}
- **super_admins**: {id, email, password, role}

## Deployment Notes
- User has a live server at 65.20.70.245
- Domain aftersales.pro DNS configured (A records pointing to server)
- Pending: SSL certificate setup with Let's Encrypt
