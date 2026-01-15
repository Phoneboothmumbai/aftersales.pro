# AfterSales.pro - Repair Job Lifecycle SaaS

## Original Problem Statement
Building a comprehensive SaaS Repair Job Lifecycle System for repair shops with:
- Multi-tenant architecture with subdomain-based isolation (shop.aftersales.pro)
- Job sheet creation with customer/device info, accessories checklist
- Status timeline: Received → Diagnosed → Waiting for Approval → Repaired → Closed
- WhatsApp integration via wa.me links (no API required)
- PDF job sheet generation
- Admin/Technician role-based access
- Multi-branch support per shop
- Dark/Light mode with customizable branding

## User Personas
1. **Shop Owner/Admin**: Creates tenant, manages team, branches, settings
2. **Technician**: Creates jobs, adds diagnosis, marks repairs complete
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

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- Complete REST API with 25+ endpoints
- Tenant management (signup, settings, subdomain check)
- User management (CRUD, role-based access)
- Branch management (CRUD)
- Job management (full lifecycle)
- PDF generation with QR code using ReportLab + qrcode
- WhatsApp message generation
- **Photo upload system** (before/after/damage types)
- **Public tracking endpoint** (no auth required)
- Super Admin panel endpoints

### Frontend (React + Tailwind + Shadcn)
- Landing page with features, pricing sections
- Signup flow with 2-step wizard
- Login with subdomain validation
- Dashboard with stats and quick actions
- Jobs list with filters and search
- Job creation form with all fields
- Job detail view with status timeline
- **Device Photos section** with drag & drop upload
- **Customer Tracking card** with copy link/preview buttons
- Diagnosis, Repair, and Closure modals
- Team management (Admin only)
- Branch management (Admin only)
- Settings with theme toggle
- Super Admin login & dashboard
- **Public tracking page** at /track

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
- [ ] Email notifications (pending)

### P2 (Medium Priority) - Phase 3
- [ ] Technician performance metrics
- [ ] AMC/repeat customer tagging
- [ ] Inventory management
- [ ] Invoice generation

### P3 (Nice to Have)
- [ ] Mobile app (PWA)
- [ ] WhatsApp Business API integration
- [ ] Payment gateway integration
- [ ] Multi-language support (Hindi)

## Next Tasks
1. Implement email notifications for status updates
2. Add search by date range filter
3. Technician performance metrics dashboard
4. AMC/repeat customer tagging

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router, react-dropzone
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, ReportLab, qrcode, aiofiles
- **Database**: MongoDB
- **Authentication**: JWT with bcrypt password hashing

## API Endpoints Added (Jan 15, 2026)
- `GET /api/public/track/{job_number}/{tracking_token}` - Public job status (no auth)
- `POST /api/jobs/{job_id}/photos` - Upload photo to job
- `DELETE /api/jobs/{job_id}/photos/{photo_id}` - Delete photo from job
- `GET /api/jobs/{job_id}/tracking-link` - Get tracking link info

## Database Schema Updates
Jobs collection now includes:
- `photos: []` - Array of photo objects {id, url, type, uploaded_at}
- `tracking_token: str` - 8-char uppercase token for public tracking
