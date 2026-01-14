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
3. **Customer**: Receives WhatsApp updates (not a system user)

## Core Requirements (Static)
- [x] Multi-tenant SaaS with subdomain isolation
- [x] JWT-based authentication with Admin/Technician roles
- [x] Signup flow with subdomain validation and 14-day trial
- [x] Complete job lifecycle management
- [x] Accessories checklist with custom items
- [x] Status timeline with audit trail
- [x] WhatsApp message generation (wa.me links)
- [x] PDF job sheet generation
- [x] Multi-branch support
- [x] Dark/Light theme toggle

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- Complete REST API with 16+ endpoints
- Tenant management (signup, settings, subdomain check)
- User management (CRUD, role-based access)
- Branch management (CRUD)
- Job management (full lifecycle)
- PDF generation using ReportLab
- WhatsApp message generation

### Frontend (React + Tailwind + Shadcn)
- Landing page with features, pricing sections
- Signup flow with 2-step wizard
- Login with subdomain validation
- Dashboard with stats and quick actions
- Jobs list with filters and search
- Job creation form with all fields
- Job detail view with status timeline
- Diagnosis, Repair, and Closure modals
- Team management (Admin only)
- Branch management (Admin only)
- Settings with theme toggle

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Multi-tenant architecture
- ✅ Authentication system
- ✅ Job CRUD operations
- ✅ Status workflow

### P1 (High Priority) - Phase 2
- [ ] Customer status page (read-only public link)
- [ ] Photo upload for device condition
- [ ] QR code on job sheets
- [ ] Email notifications

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
1. Add photo upload for device condition proof
2. Create customer-facing status tracking page
3. Add QR/Barcode on printed job sheets
4. Implement email notifications for status updates
5. Add search by date range filter

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, ReportLab
- **Database**: MongoDB
- **Authentication**: JWT with bcrypt password hashing
