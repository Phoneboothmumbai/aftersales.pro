from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import qrcode
import aiofiles
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'aftersales-pro-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Upload directory for photos
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="AfterSales.pro API")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class TenantCreate(BaseModel):
    company_name: str
    subdomain: str
    admin_name: str
    admin_email: EmailStr
    admin_password: str

class TenantResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_name: str
    subdomain: str
    settings: dict
    trial_ends_at: str
    created_at: str

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "technician"
    branch_id: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    created_at: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    subdomain: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    tenant: TenantResponse

class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None

class BranchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: str

class CustomerInfo(BaseModel):
    name: str
    mobile: str
    email: Optional[str] = None

class DeviceInfo(BaseModel):
    device_type: str  # Laptop, Mobile, Tablet, Other
    brand: str
    model: str
    serial_imei: Optional[str] = None  # Made optional
    condition: Optional[str] = None  # Made optional - Fresh, Active, Physical Damage, Dead, Liquid
    condition_notes: Optional[str] = None
    notes: Optional[str] = None  # Additional notes about the device
    password: Optional[str] = None  # Device password/PIN
    unlock_pattern: Optional[str] = None  # Android unlock pattern (e.g., "1-2-3-6-9")

class AccessoryItem(BaseModel):
    name: str
    checked: bool = False

class JobCreate(BaseModel):
    customer: CustomerInfo
    device: DeviceInfo
    accessories: List[AccessoryItem]
    problem_description: str
    technician_observation: Optional[str] = None
    branch_id: Optional[str] = None

class DiagnosisUpdate(BaseModel):
    diagnosis: str
    estimated_cost: float
    estimated_timeline: str
    parts_required: Optional[str] = None

class ApprovalUpdate(BaseModel):
    approved_by: str  # Customer name who approved
    approved_amount: float
    approval_notes: Optional[str] = None

class PartUsed(BaseModel):
    inventory_id: str
    item_name: str
    quantity: int = 1
    unit_price: float = 0

class RepairUpdate(BaseModel):
    work_done: str
    parts_used: Optional[List[PartUsed]] = None  # Parts from inventory
    parts_replaced: Optional[str] = None  # Legacy text field
    final_amount: float
    warranty_info: Optional[str] = None

class DeliveryUpdate(BaseModel):
    delivered_to: str  # Who received the device
    amount_received: float
    payment_mode: str  # Cash, UPI, Card, Credit
    payment_reference: Optional[str] = None
    delivery_notes: Optional[str] = None
    is_credit: bool = False  # If true, amount is credited to customer ledger
    credit_amount: Optional[float] = None  # Amount to be credited
    expense_parts: Optional[float] = None  # Parts/materials cost (optional)
    expense_labor: Optional[float] = None  # Labor cost (optional)

class BulkExpenseUpdate(BaseModel):
    job_id: str
    expense_parts: float
    expense_labor: float

class BulkExpenseRequest(BaseModel):
    expenses: List[BulkExpenseUpdate]

class ProfitPasswordSet(BaseModel):
    password: str

class ProfitPasswordVerify(BaseModel):
    password: str

class CustomerPayment(BaseModel):
    customer_id: str
    amount: float
    payment_mode: str  # Cash, UPI, Card, Bank Transfer
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    job_id: Optional[str] = None  # Optional link to a specific job

class CloseJobRequest(BaseModel):
    device_delivered: bool = True
    accessories_returned: List[str] = []
    payment_mode: str
    invoice_reference: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class JobResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    branch_id: Optional[str]
    job_number: str
    customer: CustomerInfo
    device: DeviceInfo
    accessories: List[AccessoryItem]
    problem_description: str
    technician_observation: Optional[str]
    status: str
    diagnosis: Optional[dict] = None
    approval: Optional[dict] = None  # Who approved, amount approved
    repair: Optional[dict] = None
    delivery: Optional[dict] = None  # Delivery details, amount received
    closure: Optional[dict] = None
    photos: List[dict] = []  # List of photo objects {id, url, type, uploaded_at}
    status_history: List[dict]
    created_by: str
    created_at: str
    updated_at: str
    tracking_token: Optional[str] = None  # For public tracking

class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    footer_text: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[str] = None

# ==================== INVENTORY MODELS ====================

class InventoryItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    quantity: int = 0
    min_stock_level: int = 5
    cost_price: float = 0
    selling_price: float = 0
    supplier: Optional[str] = None
    description: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    min_stock_level: Optional[int] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    supplier: Optional[str] = None
    description: Optional[str] = None

class InventoryItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    quantity: int
    min_stock_level: int
    cost_price: float
    selling_price: float
    supplier: Optional[str] = None
    description: Optional[str] = None
    is_low_stock: bool = False
    created_at: str
    updated_at: str

class StockAdjustment(BaseModel):
    quantity_change: int  # Positive for add, negative for remove
    reason: str
    job_id: Optional[str] = None  # Link to job if used in repair

# ==================== LEGAL PAGES MODELS ====================

class LegalPageUpdate(BaseModel):
    content: str
    is_enabled: bool = True

class LegalPagesConfig(BaseModel):
    privacy_policy: Optional[str] = None
    terms_of_service: Optional[str] = None
    refund_policy: Optional[str] = None
    disclaimer: Optional[str] = None
    privacy_enabled: bool = True
    terms_enabled: bool = True
    refund_enabled: bool = True
    disclaimer_enabled: bool = True

# Default legal page templates with compliant language
DEFAULT_LEGAL_PAGES = {
    "privacy_policy": """# Privacy Policy

**Last Updated: {date}**

## 1. Information We Collect

We collect information you provide directly to us, including:
- Name, email address, phone number
- Device information for repair services
- Payment and billing information
- Communication records

## 2. How We Use Your Information

Data collected through the platform may be processed to operate, maintain, improve, optimize, and enhance platform features, user experience, performance, reliability, and security.

## 3. Aggregated & Anonymized Data

We may analyze platform usage patterns, trends, and behaviors using aggregated and anonymized data that does not directly identify any individual, device, or business.

## 4. Third-Party Service Providers

Certain data may be processed through trusted third-party service providers for purposes including analytics, performance measurement, platform optimization, communication delivery, and service improvement.

## 5. Communications

Platform communications, updates, feature announcements, and relevant service information may be delivered based on user activity and usage context.

## 6. Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## 7. No Sale of Personal Data

**We do not sell personally identifiable user data.**

## 8. Your Rights

You have the right to:
- Access your personal data
- Request correction of inaccurate data
- Request deletion of your data
- Opt-out of marketing communications

## 9. Data Retention

We retain your information for as long as necessary to provide services and fulfill the purposes outlined in this policy.

## 10. Contact Us

For privacy-related inquiries, please contact us at the information provided on our website.
""",
    
    "terms_of_service": """# Terms of Service

**Last Updated: {date}**

## 1. Acceptance of Terms

By accessing or using our platform, you agree to be bound by these Terms of Service.

## 2. Description of Service

We provide a repair job management platform for repair shops to track and manage device repairs.

## 3. User Accounts

- You are responsible for maintaining the confidentiality of your account
- You must provide accurate and complete information
- You are responsible for all activities under your account

## 4. Platform Rights

The platform retains the right to analyze usage data to improve services, develop new features, enhance system intelligence, and optimize user experience, provided such analysis does not intentionally disclose personally identifiable information.

## 5. User Responsibilities

Users must:
- Comply with all applicable laws and regulations
- Not misuse the platform or interfere with its operation
- Not attempt to gain unauthorized access
- Use the service only for lawful purposes

## 6. Intellectual Property

All content, features, and functionality are owned by us and protected by intellectual property laws.

## 7. Data & Analytics Disclaimer

Any insights, reports, recommendations, or analytics generated by the platform are indicative only and should not be treated as business, legal, or operational advice.

## 8. Limitation of Liability

To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages.

## 9. Modifications

We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.

## 10. Termination

We may terminate or suspend access to our service immediately, without prior notice, for any breach of these Terms.

## 11. Governing Law

These terms shall be governed by the laws of India, without regard to conflict of law provisions.
""",
    
    "refund_policy": """# Refund & Cancellation Policy

**Last Updated: {date}**

## 1. Service Fees

Subscription fees are billed in advance on a monthly/annual basis.

## 2. Refund Eligibility

- Refunds may be requested within 7 days of initial purchase
- Refunds are not available for partially used subscription periods
- Refunds are processed to the original payment method

## 3. Cancellation

- You may cancel your subscription at any time
- Cancellation takes effect at the end of the current billing period
- No refunds for the remaining period after cancellation

## 4. Free Trial

- Free trial users will not be charged until the trial ends
- You may cancel before the trial ends without any charges

## 5. Disputes

For billing disputes, contact our support team within 30 days of the charge.

## 6. Processing Time

Approved refunds are processed within 7-10 business days.

## 7. Contact

For refund requests, please contact our support team with your account details and reason for the request.
""",
    
    "disclaimer": """# Disclaimer

**Last Updated: {date}**

## 1. General Information

The information provided on this platform is for general informational purposes only.

## 2. No Professional Advice

The platform does not provide professional, legal, financial, or technical advice. Users should consult appropriate professionals for specific advice.

## 3. No Warranty

The platform is provided "as is" without warranties of any kind, either express or implied.

## 4. Data Accuracy

While we strive to provide accurate information, we do not guarantee the accuracy, completeness, or timeliness of any information on the platform.

## 5. Third-Party Links

The platform may contain links to third-party websites. We are not responsible for the content or practices of these sites.

## 6. No Expectation of Confidentiality

Users acknowledge that data submitted to the platform is provided for operational use and system processing and should not be considered confidential beyond reasonable security practices.

## 7. Limitation of Liability

Under no circumstances shall we be liable for any direct, indirect, incidental, consequential, special, or exemplary damages arising from your use of the platform.

## 8. Changes

We reserve the right to modify this disclaimer at any time without prior notice.
"""
}

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, tenant_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== PLAN LIMIT ENFORCEMENT ====================

async def get_tenant_plan(tenant_id: str) -> dict:
    """Get the current plan for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        return None
    
    plan_id = tenant.get("subscription_plan", "free")
    plan = await db.subscription_plans.find_one({"id": plan_id, "is_active": True}, {"_id": 0})
    
    if not plan:
        # Fallback to free plan limits if plan not found
        plan = await db.subscription_plans.find_one({"id": "free"}, {"_id": 0})
    
    return plan

async def check_user_limit(tenant_id: str) -> dict:
    """Check if tenant can add more users"""
    plan = await get_tenant_plan(tenant_id)
    if not plan:
        return {"allowed": False, "message": "Tenant not found"}
    
    max_users = plan.get("max_users", 1)
    if max_users == -1:  # Unlimited
        return {"allowed": True}
    
    current_users = await db.users.count_documents({"tenant_id": tenant_id})
    if current_users >= max_users:
        return {
            "allowed": False,
            "message": f"User limit reached ({current_users}/{max_users}). Upgrade your plan to add more users.",
            "current": current_users,
            "limit": max_users,
            "plan": plan.get("name", "Free")
        }
    return {"allowed": True, "current": current_users, "limit": max_users}

async def check_branch_limit(tenant_id: str) -> dict:
    """Check if tenant can add more branches"""
    plan = await get_tenant_plan(tenant_id)
    if not plan:
        return {"allowed": False, "message": "Tenant not found"}
    
    max_branches = plan.get("max_branches", 1)
    if max_branches == -1:  # Unlimited
        return {"allowed": True}
    
    current_branches = await db.branches.count_documents({"tenant_id": tenant_id})
    if current_branches >= max_branches:
        return {
            "allowed": False,
            "message": f"Branch limit reached ({current_branches}/{max_branches}). Upgrade your plan to add more branches.",
            "current": current_branches,
            "limit": max_branches,
            "plan": plan.get("name", "Free")
        }
    return {"allowed": True, "current": current_branches, "limit": max_branches}

async def check_job_limit(tenant_id: str) -> dict:
    """Check if tenant can create more jobs this month"""
    plan = await get_tenant_plan(tenant_id)
    if not plan:
        return {"allowed": False, "message": "Tenant not found"}
    
    max_jobs = plan.get("max_jobs_per_month", 50)
    if max_jobs == -1:  # Unlimited
        return {"allowed": True}
    
    # Count jobs created this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    current_jobs = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": month_start}
    })
    
    if current_jobs >= max_jobs:
        return {
            "allowed": False,
            "message": f"Monthly job limit reached ({current_jobs}/{max_jobs}). Upgrade your plan to create more jobs.",
            "current": current_jobs,
            "limit": max_jobs,
            "plan": plan.get("name", "Free")
        }
    return {"allowed": True, "current": current_jobs, "limit": max_jobs}

async def check_inventory_limit(tenant_id: str) -> dict:
    """Check if tenant can add more inventory items"""
    plan = await get_tenant_plan(tenant_id)
    if not plan:
        return {"allowed": False, "message": "Tenant not found"}
    
    max_items = plan.get("max_inventory_items", 50)
    if max_items == -1:  # Unlimited
        return {"allowed": True}
    
    current_items = await db.inventory.count_documents({"tenant_id": tenant_id})
    if current_items >= max_items:
        return {
            "allowed": False,
            "message": f"Inventory limit reached ({current_items}/{max_items}). Upgrade your plan to add more items.",
            "current": current_items,
            "limit": max_items,
            "plan": plan.get("name", "Free")
        }
    return {"allowed": True, "current": current_items, "limit": max_items}

async def check_photo_limit(tenant_id: str, job_id: str) -> dict:
    """Check if job can have more photos"""
    plan = await get_tenant_plan(tenant_id)
    if not plan:
        return {"allowed": False, "message": "Tenant not found"}
    
    max_photos = plan.get("max_photos_per_job", 3)
    if max_photos == -1:  # Unlimited
        return {"allowed": True}
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": tenant_id})
    if not job:
        return {"allowed": False, "message": "Job not found"}
    
    current_photos = len(job.get("photos", []))
    if current_photos >= max_photos:
        return {
            "allowed": False,
            "message": f"Photo limit reached ({current_photos}/{max_photos}). Upgrade your plan to add more photos.",
            "current": current_photos,
            "limit": max_photos,
            "plan": plan.get("name", "Free")
        }
    return {"allowed": True, "current": current_photos, "limit": max_photos}

async def check_feature_access(tenant_id: str, feature: str) -> dict:
    """Check if tenant has access to a specific feature"""
    plan = await get_tenant_plan(tenant_id)
    if not plan:
        return {"allowed": False, "message": "Tenant not found"}
    
    features = plan.get("features", {})
    if not features.get(feature, False):
        return {
            "allowed": False,
            "message": f"This feature is not available in your current plan ({plan.get('name', 'Free')}). Please upgrade to access this feature.",
            "feature": feature,
            "plan": plan.get("name", "Free")
        }
    return {"allowed": True}

# ==================== UTILITY FUNCTIONS ====================

async def generate_job_number(tenant_id: str) -> str:
    year = datetime.now(timezone.utc).year
    count = await db.jobs.count_documents({"tenant_id": tenant_id})
    return f"JOB-{year}-{str(count + 1).zfill(6)}"

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "AfterSales.pro API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# ==================== TENANT ROUTES ====================

@api_router.post("/tenants/signup", response_model=LoginResponse)
async def signup_tenant(data: TenantCreate):
    # Check if subdomain is taken
    existing = await db.tenants.find_one({"subdomain": data.subdomain.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already taken")
    
    # Check if email is taken
    existing_email = await db.users.find_one({"email": data.admin_email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    trial_ends = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    
    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = {
        "id": tenant_id,
        "company_name": data.company_name,
        "subdomain": data.subdomain.lower(),
        "settings": {
            "theme": "light",
            "language": "en",
            "logo_url": None,
            "address": "",
            "phone": "",
            "email": data.admin_email,
            "footer_text": f"Thank you for choosing {data.company_name}"
        },
        "trial_ends_at": trial_ends,
        "created_at": now
    }
    await db.tenants.insert_one(tenant)
    
    # Create admin user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "tenant_id": tenant_id,
        "name": data.admin_name,
        "email": data.admin_email.lower(),
        "password": hash_password(data.admin_password),
        "role": "admin",
        "branch_id": None,
        "created_at": now
    }
    await db.users.insert_one(user)
    
    # Create default branch
    branch_id = str(uuid.uuid4())
    branch = {
        "id": branch_id,
        "tenant_id": tenant_id,
        "name": "Main Branch",
        "address": "",
        "phone": "",
        "created_at": now
    }
    await db.branches.insert_one(branch)
    
    token = create_token(user_id, tenant_id, "admin")
    
    user_response = {k: v for k, v in user.items() if k != "password"}
    tenant_response = {k: v for k, v in tenant.items()}
    
    return LoginResponse(token=token, user=UserResponse(**user_response), tenant=TenantResponse(**tenant_response))

@api_router.get("/tenants/check-subdomain/{subdomain}")
async def check_subdomain(subdomain: str):
    existing = await db.tenants.find_one({"subdomain": subdomain.lower()})
    return {"available": existing is None}

@api_router.get("/tenants/me", response_model=TenantResponse)
async def get_current_tenant(user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantResponse(**tenant)

@api_router.get("/tenants/plan-usage")
async def get_plan_usage(user: dict = Depends(get_current_user)):
    """Get current plan limits and usage for the tenant"""
    tenant_id = user["tenant_id"]
    plan = await get_tenant_plan(tenant_id)
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get current month start for job count
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Get all usage counts
    user_count = await db.users.count_documents({"tenant_id": tenant_id})
    branch_count = await db.branches.count_documents({"tenant_id": tenant_id})
    jobs_this_month = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": month_start}
    })
    inventory_count = await db.inventory.count_documents({"tenant_id": tenant_id})
    
    return {
        "plan": {
            "id": plan.get("id"),
            "name": plan.get("name"),
            "description": plan.get("description")
        },
        "usage": {
            "users": {
                "current": user_count,
                "limit": plan.get("max_users", 1),
                "unlimited": plan.get("max_users", 1) == -1
            },
            "branches": {
                "current": branch_count,
                "limit": plan.get("max_branches", 1),
                "unlimited": plan.get("max_branches", 1) == -1
            },
            "jobs_this_month": {
                "current": jobs_this_month,
                "limit": plan.get("max_jobs_per_month", 50),
                "unlimited": plan.get("max_jobs_per_month", 50) == -1
            },
            "inventory_items": {
                "current": inventory_count,
                "limit": plan.get("max_inventory_items", 50),
                "unlimited": plan.get("max_inventory_items", 50) == -1
            },
            "photos_per_job": {
                "limit": plan.get("max_photos_per_job", 3),
                "unlimited": plan.get("max_photos_per_job", 3) == -1
            },
            "storage_mb": {
                "limit": plan.get("max_storage_mb", 100),
                "unlimited": plan.get("max_storage_mb", 100) == -1
            }
        },
        "features": plan.get("features", {})
    }

@api_router.put("/tenants/settings")
async def update_tenant_settings(settings: SettingsUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    
    if "company_name" in update_data:
        await db.tenants.update_one(
            {"id": user["tenant_id"]},
            {"$set": {"company_name": update_data.pop("company_name")}}
        )
    
    if update_data:
        settings_update = {f"settings.{k}": v for k, v in update_data.items()}
        await db.tenants.update_one({"id": user["tenant_id"]}, {"$set": settings_update})
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    return TenantResponse(**tenant)

# ==================== LEGAL PAGES ROUTES ====================

@api_router.get("/legal/{page_type}")
async def get_legal_page(page_type: str, subdomain: Optional[str] = None):
    """Get a legal page content (public endpoint)"""
    valid_pages = ["privacy_policy", "terms_of_service", "refund_policy", "disclaimer"]
    if page_type not in valid_pages:
        raise HTTPException(status_code=404, detail="Page not found")
    
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    # If subdomain provided, try to get tenant-specific content first
    if subdomain:
        tenant = await db.tenants.find_one({"subdomain": subdomain.lower()}, {"_id": 0})
        if tenant:
            legal_pages = tenant.get("legal_pages", {})
            # Check if page is enabled for this tenant
            enabled_key = f"{page_type.replace('_policy', '').replace('_of_service', '')}_enabled"
            if not legal_pages.get(enabled_key, True):
                raise HTTPException(status_code=404, detail="Page not available")
            
            # Return tenant-specific content if available
            if legal_pages.get(page_type):
                return {
                    "page_type": page_type,
                    "content": legal_pages[page_type],
                    "company_name": tenant.get("company_name", ""),
                    "is_custom": True
                }
    
    # Try to get global platform settings
    platform_settings = await db.platform_settings.find_one({"type": "legal_pages"}, {"_id": 0})
    if platform_settings and platform_settings.get(page_type):
        return {
            "page_type": page_type,
            "content": platform_settings[page_type].replace("{date}", today),
            "is_custom": True
        }
    
    # Return default content
    content = DEFAULT_LEGAL_PAGES.get(page_type, "")
    content = content.replace("{date}", today)
    
    return {
        "page_type": page_type,
        "content": content,
        "is_custom": False
    }

@api_router.get("/tenants/legal-pages")
async def get_tenant_legal_pages(user: dict = Depends(require_admin)):
    """Get all legal pages configuration for the tenant"""
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    legal_pages = tenant.get("legal_pages", {})
    
    # Return current config with defaults
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    return {
        "privacy_policy": legal_pages.get("privacy_policy", DEFAULT_LEGAL_PAGES["privacy_policy"].replace("{date}", today)),
        "terms_of_service": legal_pages.get("terms_of_service", DEFAULT_LEGAL_PAGES["terms_of_service"].replace("{date}", today)),
        "refund_policy": legal_pages.get("refund_policy", DEFAULT_LEGAL_PAGES["refund_policy"].replace("{date}", today)),
        "disclaimer": legal_pages.get("disclaimer", DEFAULT_LEGAL_PAGES["disclaimer"].replace("{date}", today)),
        "privacy_enabled": legal_pages.get("privacy_enabled", True),
        "terms_enabled": legal_pages.get("terms_enabled", True),
        "refund_enabled": legal_pages.get("refund_enabled", True),
        "disclaimer_enabled": legal_pages.get("disclaimer_enabled", True)
    }

@api_router.put("/tenants/legal-pages/{page_type}")
async def update_tenant_legal_page(
    page_type: str,
    data: LegalPageUpdate,
    user: dict = Depends(require_admin)
):
    """Update a specific legal page for the tenant"""
    valid_pages = ["privacy_policy", "terms_of_service", "refund_policy", "disclaimer"]
    if page_type not in valid_pages:
        raise HTTPException(status_code=400, detail="Invalid page type")
    
    enabled_key = page_type.replace("_policy", "_enabled").replace("_of_service", "_enabled")
    if page_type == "terms_of_service":
        enabled_key = "terms_enabled"
    elif page_type == "privacy_policy":
        enabled_key = "privacy_enabled"
    
    update_data = {
        f"legal_pages.{page_type}": data.content,
        f"legal_pages.{enabled_key}": data.is_enabled,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tenants.update_one(
        {"id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    return {"message": f"{page_type.replace('_', ' ').title()} updated successfully"}

@api_router.post("/tenants/legal-pages/reset/{page_type}")
async def reset_legal_page_to_default(
    page_type: str,
    user: dict = Depends(require_admin)
):
    """Reset a legal page to default content"""
    valid_pages = ["privacy_policy", "terms_of_service", "refund_policy", "disclaimer"]
    if page_type not in valid_pages:
        raise HTTPException(status_code=400, detail="Invalid page type")
    
    await db.tenants.update_one(
        {"id": user["tenant_id"]},
        {"$unset": {f"legal_pages.{page_type}": ""}}
    )
    
    return {"message": f"{page_type.replace('_', ' ').title()} reset to default"}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    # Find tenant by subdomain
    tenant = await db.tenants.find_one({"subdomain": data.subdomain.lower()}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid subdomain")
    
    # Find user
    user = await db.users.find_one({
        "email": data.email.lower(),
        "tenant_id": tenant["id"]
    })
    
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["tenant_id"], user["role"])
    
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    
    return LoginResponse(token=token, user=UserResponse(**user_response), tenant=TenantResponse(**tenant))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ==================== PASSWORD CHANGE ====================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change password for logged-in shop user"""
    # Get user from database to verify current password
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(data.current_password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

# ==================== USER ROUTES ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, admin: dict = Depends(require_admin)):
    # Check plan limit
    limit_check = await check_user_limit(admin["tenant_id"])
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["message"])
    
    existing = await db.users.find_one({
        "email": data.email.lower(),
        "tenant_id": admin["tenant_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    
    user = {
        "id": user_id,
        "tenant_id": admin["tenant_id"],
        "name": data.name,
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "role": data.role,
        "branch_id": data.branch_id,
        "created_at": now
    }
    await db.users.insert_one(user)
    
    user_response = {k: v for k, v in user.items() if k != "password"}
    return UserResponse(**user_response)

@api_router.get("/users", response_model=List[UserResponse])
async def list_users(user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, admin: dict = Depends(require_admin)):
    """Update a team member's details"""
    # Check if user exists
    existing = await db.users.find_one({
        "id": user_id,
        "tenant_id": admin["tenant_id"]
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update data
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.email:
        # Check if email is already taken by another user
        email_exists = await db.users.find_one({
            "email": data.email,
            "tenant_id": admin["tenant_id"],
            "id": {"$ne": user_id}
        })
        if email_exists:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = data.email
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.role:
        update_data["role"] = data.role
    if data.branch_id is not None:
        update_data["branch_id"] = data.branch_id if data.branch_id else None
    
    if update_data:
        await db.users.update_one(
            {"id": user_id, "tenant_id": admin["tenant_id"]},
            {"$set": update_data}
        )
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({
        "id": user_id,
        "tenant_id": admin["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}

# ==================== BRANCH ROUTES ====================

@api_router.post("/branches", response_model=BranchResponse)
async def create_branch(data: BranchCreate, admin: dict = Depends(require_admin)):
    # Check plan limit
    limit_check = await check_branch_limit(admin["tenant_id"])
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["message"])
    
    # Check feature access
    feature_check = await check_feature_access(admin["tenant_id"], "multi_branch")
    current_branches = await db.branches.count_documents({"tenant_id": admin["tenant_id"]})
    if current_branches >= 1 and not feature_check["allowed"]:
        raise HTTPException(status_code=403, detail="Multi-branch feature is not available in your current plan. Please upgrade to add more branches.")
    
    now = datetime.now(timezone.utc).isoformat()
    branch_id = str(uuid.uuid4())
    
    branch = {
        "id": branch_id,
        "tenant_id": admin["tenant_id"],
        "name": data.name,
        "address": data.address,
        "phone": data.phone,
        "created_at": now
    }
    await db.branches.insert_one(branch)
    return BranchResponse(**branch)

@api_router.get("/branches", response_model=List[BranchResponse])
async def list_branches(user: dict = Depends(get_current_user)):
    branches = await db.branches.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0}
    ).to_list(100)
    return [BranchResponse(**b) for b in branches]

@api_router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, admin: dict = Depends(require_admin)):
    # Check if branch has jobs
    job_count = await db.jobs.count_documents({
        "branch_id": branch_id,
        "tenant_id": admin["tenant_id"]
    })
    if job_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete branch with existing jobs")
    
    result = await db.branches.delete_one({
        "id": branch_id,
        "tenant_id": admin["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    return {"message": "Branch deleted"}

# ==================== JOB ROUTES ====================

@api_router.post("/jobs", response_model=JobResponse)
async def create_job(data: JobCreate, user: dict = Depends(get_current_user)):
    # Check plan limit
    limit_check = await check_job_limit(user["tenant_id"])
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["message"])
    
    now = datetime.now(timezone.utc).isoformat()
    job_id = str(uuid.uuid4())
    job_number = await generate_job_number(user["tenant_id"])
    tracking_token = str(uuid.uuid4())[:8].upper()  # Short token for public tracking
    
    job = {
        "id": job_id,
        "tenant_id": user["tenant_id"],
        "branch_id": data.branch_id or user.get("branch_id"),
        "job_number": job_number,
        "customer": data.customer.model_dump(),
        "device": data.device.model_dump(),
        "accessories": [a.model_dump() for a in data.accessories],
        "problem_description": data.problem_description,
        "technician_observation": data.technician_observation,
        "status": "received",
        "diagnosis": None,
        "approval": None,  # Customer approval data
        "repair": None,
        "delivery": None,  # Delivery data
        "closure": None,
        "photos": [],  # Initialize empty photos array
        "tracking_token": tracking_token,  # For public tracking
        "status_history": [{
            "status": "received",
            "timestamp": now,
            "user_id": user["id"],
            "user_name": user["name"],
            "notes": "Job created"
        }],
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.jobs.insert_one(job)
    
    return JobResponse(**job)

@api_router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    status_filter: Optional[str] = None,
    branch_id: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    query = {"tenant_id": user["tenant_id"]}
    
    if status_filter:
        query["status"] = status_filter
    if branch_id:
        query["branch_id"] = branch_id
    if search:
        query["$or"] = [
            {"job_number": {"$regex": search, "$options": "i"}},
            {"customer.name": {"$regex": search, "$options": "i"}},
            {"customer.mobile": {"$regex": search, "$options": "i"}},
            {"device.serial_imei": {"$regex": search, "$options": "i"}}
        ]
    
    # Date range filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            # Add time to include the entire end day
            date_query["$lte"] = date_to + "T23:59:59"
        query["created_at"] = date_query
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [JobResponse(**j) for j in jobs]

# ==================== UNIVERSAL SEARCH ====================

@api_router.get("/search")
async def universal_search(
    q: str,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """
    Universal search across jobs - searches:
    - Job number
    - Customer name, mobile, email
    - Device brand, model, serial/IMEI
    - Problem description
    """
    tenant_id = user["tenant_id"]
    
    if not q or len(q) < 2:
        return {"results": [], "total": 0}
    
    # Build comprehensive search query
    search_regex = {"$regex": q, "$options": "i"}
    
    query = {
        "tenant_id": tenant_id,
        "$or": [
            {"job_number": search_regex},
            {"customer.name": search_regex},
            {"customer.mobile": search_regex},
            {"customer.email": search_regex},
            {"device.brand": search_regex},
            {"device.model": search_regex},
            {"device.serial_imei": search_regex},
            {"problem_description": search_regex},
            {"technician_observation": search_regex},
            {"device.notes": search_regex},
        ]
    }
    
    # Get matching jobs
    jobs = await db.jobs.find(
        query,
        {
            "_id": 0,
            "id": 1,
            "job_number": 1,
            "customer": 1,
            "device": 1,
            "status": 1,
            "problem_description": 1,
            "created_at": 1
        }
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Format results for easy display
    results = []
    for job in jobs:
        results.append({
            "id": job["id"],
            "job_number": job["job_number"],
            "customer_name": job["customer"]["name"],
            "customer_mobile": job["customer"]["mobile"],
            "device": f"{job['device']['brand']} {job['device']['model']}",
            "device_serial": job["device"]["serial_imei"],
            "status": job["status"],
            "problem": job["problem_description"][:100] + "..." if len(job["problem_description"]) > 100 else job["problem_description"],
            "created_at": job["created_at"],
            "type": "job"
        })
    
    # Also search customers (unique by mobile)
    customer_pipeline = [
        {"$match": {
            "tenant_id": tenant_id,
            "$or": [
                {"customer.name": search_regex},
                {"customer.mobile": search_regex},
                {"customer.email": search_regex},
            ]
        }},
        {"$group": {
            "_id": "$customer.mobile",
            "name": {"$first": "$customer.name"},
            "mobile": {"$first": "$customer.mobile"},
            "email": {"$first": "$customer.email"},
            "job_count": {"$sum": 1}
        }},
        {"$limit": 5}
    ]
    
    customers = await db.jobs.aggregate(customer_pipeline).to_list(5)
    
    for cust in customers:
        results.append({
            "id": cust["mobile"],
            "customer_name": cust["name"],
            "customer_mobile": cust["mobile"],
            "customer_email": cust.get("email"),
            "job_count": cust["job_count"],
            "type": "customer"
        })
    
    # Also search inventory
    inventory_items = await db.inventory.find(
        {
            "tenant_id": tenant_id,
            "$or": [
                {"name": search_regex},
                {"sku": search_regex},
                {"description": search_regex},
            ]
        },
        {"_id": 0, "id": 1, "name": 1, "sku": 1, "quantity": 1, "category": 1}
    ).limit(5).to_list(5)
    
    for item in inventory_items:
        results.append({
            "id": item["id"],
            "name": item["name"],
            "sku": item["sku"],
            "quantity": item["quantity"],
            "category": item.get("category"),
            "type": "inventory"
        })
    
    return {
        "results": results,
        "total": len(results),
        "query": q
    }

@api_router.get("/jobs/stats")
async def get_job_stats(user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    status_counts = await db.jobs.aggregate(pipeline).to_list(10)
    stats = {item["_id"]: item["count"] for item in status_counts}
    
    total = sum(stats.values())
    
    # Get today's jobs
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    return {
        "total": total,
        "received": stats.get("received", 0),
        "diagnosed": stats.get("diagnosed", 0),
        "waiting_for_approval": stats.get("waiting_for_approval", 0),
        "repaired": stats.get("repaired", 0),
        "closed": stats.get("closed", 0),
        "today": today_count
    }

@api_router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({
        "id": job_id,
        "tenant_id": user["tenant_id"]
    }, {"_id": 0})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(**job)

@api_router.put("/jobs/{job_id}/diagnosis")
async def update_diagnosis(job_id: str, data: DiagnosisUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot update closed job")
    
    diagnosis = {
        "diagnosis": data.diagnosis,
        "estimated_cost": data.estimated_cost,
        "estimated_timeline": data.estimated_timeline,
        "parts_required": data.parts_required,
        "updated_at": now,
        "updated_by": user["id"]
    }
    
    status_entry = {
        "status": "waiting_for_approval",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": f"Diagnosis complete. Estimated cost: ₹{data.estimated_cost}"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "diagnosis": diagnosis,
                "status": "waiting_for_approval",
                "updated_at": now
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

@api_router.put("/jobs/{job_id}/approve")
async def approve_job(job_id: str, data: ApprovalUpdate, user: dict = Depends(get_current_user)):
    """Customer approves the diagnosis and estimated cost"""
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot update closed job")
    
    approval = {
        "approved_by": data.approved_by,
        "approved_amount": data.approved_amount,
        "approval_notes": data.approval_notes,
        "approved_at": now,
        "recorded_by": user["id"]
    }
    
    status_entry = {
        "status": "in_progress",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": f"Approved by {data.approved_by}. Amount: ₹{data.approved_amount}"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "approval": approval,
                "status": "in_progress",
                "updated_at": now
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

@api_router.put("/jobs/{job_id}/pending-parts")
async def mark_pending_parts(job_id: str, notes: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Mark job as waiting for parts"""
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot update closed job")
    
    status_entry = {
        "status": "pending_parts",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": notes or "Waiting for parts"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {"status": "pending_parts", "updated_at": now},
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

@api_router.put("/jobs/{job_id}/repair")
async def update_repair(job_id: str, data: RepairUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    tenant_id = user["tenant_id"]
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": tenant_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot update closed job")
    
    # Process parts from inventory
    parts_used_data = []
    total_parts_cost = 0
    
    if data.parts_used:
        for part in data.parts_used:
            # Check inventory item exists and has enough quantity
            inv_item = await db.inventory.find_one({
                "id": part.inventory_id,
                "tenant_id": tenant_id
            })
            
            if not inv_item:
                raise HTTPException(status_code=400, detail=f"Inventory item {part.item_name} not found")
            
            if inv_item["quantity"] < part.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient stock for {part.item_name}. Available: {inv_item['quantity']}, Requested: {part.quantity}"
                )
            
            # Deduct from inventory
            await db.inventory.update_one(
                {"id": part.inventory_id},
                {"$inc": {"quantity": -part.quantity}}
            )
            
            # Record the part usage
            part_record = {
                "inventory_id": part.inventory_id,
                "item_name": part.item_name,
                "quantity": part.quantity,
                "unit_price": inv_item.get("cost_price", 0),
                "total_cost": part.quantity * inv_item.get("cost_price", 0)
            }
            parts_used_data.append(part_record)
            total_parts_cost += part_record["total_cost"]
            
            # Log inventory usage
            usage_log = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "inventory_id": part.inventory_id,
                "job_id": job_id,
                "job_number": job["job_number"],
                "quantity_used": part.quantity,
                "device": f"{job['device']['brand']} {job['device']['model']}",
                "customer_name": job["customer"]["name"],
                "used_by": user["id"],
                "used_by_name": user["name"],
                "used_at": now
            }
            await db.inventory_usage.insert_one(usage_log)
    
    repair = {
        "work_done": data.work_done,
        "parts_used": parts_used_data,
        "parts_replaced": data.parts_replaced,  # Legacy text field
        "parts_cost": total_parts_cost,
        "final_amount": data.final_amount,
        "warranty_info": data.warranty_info,
        "updated_at": now,
        "updated_by": user["id"]
    }
    
    status_entry = {
        "status": "repaired",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": f"Repair complete. Final amount: ₹{data.final_amount}"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "repair": repair,
                "status": "repaired",
                "updated_at": now
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

@api_router.put("/jobs/{job_id}/deliver")
async def deliver_job(job_id: str, data: DeliveryUpdate, user: dict = Depends(get_current_user)):
    """Record device delivery and payment"""
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Job already closed")
    
    delivery = {
        "delivered_to": data.delivered_to,
        "amount_received": data.amount_received,
        "payment_mode": data.payment_mode,
        "payment_reference": data.payment_reference,
        "delivery_notes": data.delivery_notes,
        "delivered_at": now,
        "delivered_by": user["id"],
        "expense_parts": data.expense_parts,
        "expense_labor": data.expense_labor
    }
    
    status_entry = {
        "status": "delivered",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": f"Delivered to {data.delivered_to}. Received ₹{data.amount_received} via {data.payment_mode}"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "delivery": delivery,
                "status": "delivered",
                "updated_at": now
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

@api_router.put("/jobs/{job_id}/close")
async def close_job(job_id: str, user: dict = Depends(get_current_user)):
    """Final close of the job after delivery"""
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Job already closed")
    
    closure = {
        "closed_at": now,
        "closed_by": user["id"]
    }
    
    status_entry = {
        "status": "closed",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": "Job closed"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "closure": closure,
                "status": "closed",
                "updated_at": now
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

@api_router.put("/jobs/{job_id}/status")
async def update_job_status(job_id: str, data: StatusUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    valid_statuses = ["received", "diagnosed", "waiting_for_approval", "in_progress", "pending_parts", "repaired", "delivered", "closed"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed" and data.status != "closed":
        raise HTTPException(status_code=400, detail="Cannot reopen closed job")
    
    status_entry = {
        "status": data.status,
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": data.notes or f"Status changed to {data.status}"
    }
    
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {"status": data.status, "updated_at": now},
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return JobResponse(**updated_job)

# ==================== PDF GENERATION ====================

def generate_qr_code(data: str) -> BytesIO:
    """Generate QR code as bytes"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer

@api_router.get("/jobs/{job_id}/pdf")
async def generate_job_pdf(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=10)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, spaceBefore=15, spaceAfter=5)
    normal_style = styles['Normal']
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8)
    
    elements = []
    
    # Generate QR code for public tracking
    tracking_token = job.get("tracking_token", "")
    tracking_url = f"Track Status: {job['job_number']} | Token: {tracking_token}"
    qr_buffer = generate_qr_code(tracking_url)
    qr_image = Image(qr_buffer, width=25*mm, height=25*mm)
    
    # Header with QR code
    header_data = [
        [Paragraph(tenant["company_name"], title_style), qr_image],
        [Paragraph(f"Job Sheet: {job['job_number']}", heading_style), ""],
        [Paragraph(f"Date: {job['created_at'][:10]}", normal_style), Paragraph(f"Tracking: {tracking_token}", small_style)]
    ]
    header_table = Table(header_data, colWidths=[135*mm, 30*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('SPAN', (1, 0), (1, 1)),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 5*mm))
    
    # Customer Info
    elements.append(Paragraph("Customer Information", heading_style))
    customer = job["customer"]
    customer_data = [
        ["Name:", customer["name"]],
        ["Mobile:", customer["mobile"]],
        ["Email:", customer.get("email", "N/A")]
    ]
    t = Table(customer_data, colWidths=[40*mm, 120*mm])
    t.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 10)]))
    elements.append(t)
    
    # Device Info
    elements.append(Paragraph("Device Information", heading_style))
    device = job["device"]
    device_data = [
        ["Type:", device["device_type"]],
        ["Brand:", device["brand"]],
        ["Model:", device["model"]],
        ["Serial/IMEI:", device["serial_imei"]],
        ["Condition:", device["condition"]],
        ["Notes:", device.get("condition_notes", "N/A")]
    ]
    t = Table(device_data, colWidths=[40*mm, 120*mm])
    t.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 10)]))
    elements.append(t)
    
    # Accessories
    elements.append(Paragraph("Accessories Collected", heading_style))
    checked_accessories = [a["name"] for a in job["accessories"] if a["checked"]]
    accessories_text = ", ".join(checked_accessories) if checked_accessories else "None"
    elements.append(Paragraph(accessories_text, normal_style))
    
    # Problem
    elements.append(Paragraph("Problem Description", heading_style))
    elements.append(Paragraph(job["problem_description"], normal_style))
    
    if job.get("technician_observation"):
        elements.append(Paragraph("Technician Observation", heading_style))
        elements.append(Paragraph(job["technician_observation"], normal_style))
    
    # Diagnosis if available
    if job.get("diagnosis"):
        elements.append(Paragraph("Diagnosis", heading_style))
        diag = job["diagnosis"]
        diag_data = [
            ["Issue:", diag["diagnosis"]],
            ["Estimated Cost:", f"₹{diag['estimated_cost']}"],
            ["Timeline:", diag["estimated_timeline"]]
        ]
        t = Table(diag_data, colWidths=[40*mm, 120*mm])
        t.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 10)]))
        elements.append(t)
    
    # Repair if available
    if job.get("repair"):
        elements.append(Paragraph("Repair Details", heading_style))
        repair = job["repair"]
        repair_data = [
            ["Work Done:", repair["work_done"]],
            ["Parts Replaced:", repair.get("parts_replaced", "N/A")],
            ["Final Amount:", f"₹{repair['final_amount']}"],
            ["Warranty:", repair.get("warranty_info", "N/A")]
        ]
        t = Table(repair_data, colWidths=[40*mm, 120*mm])
        t.setStyle(TableStyle([('FONTNAME', (0, 0), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 0), (-1, -1), 10)]))
        elements.append(t)
    
    # Footer
    elements.append(Spacer(1, 20*mm))
    elements.append(Paragraph("_________________________          _________________________", normal_style))
    elements.append(Paragraph("Customer Signature                         Technician Signature", normal_style))
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph(tenant["settings"].get("footer_text", "Thank you for your business!"), normal_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=job-{job['job_number']}.pdf"}
    )

# ==================== PHOTO UPLOAD ====================

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@api_router.post("/jobs/{job_id}/photos")
async def upload_job_photo(
    job_id: str,
    photo_type: str = Form(default="before"),  # before, after, damage
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload a photo for a job (before/after repair, damage documentation)"""
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check plan limit for photos
    limit_check = await check_photo_limit(user["tenant_id"], job_id)
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["message"])
    
    # Check feature access
    feature_check = await check_feature_access(user["tenant_id"], "photo_upload")
    if not feature_check["allowed"]:
        raise HTTPException(status_code=403, detail=feature_check["message"])
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Read and check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed")
    
    # Create tenant-specific directory
    tenant_dir = UPLOAD_DIR / user["tenant_id"]
    tenant_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    photo_id = str(uuid.uuid4())
    filename = f"{job_id}_{photo_id}{file_ext}"
    file_path = tenant_dir / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(contents)
    
    # Create photo record
    now = datetime.now(timezone.utc).isoformat()
    photo = {
        "id": photo_id,
        "filename": filename,
        "url": f"/uploads/{user['tenant_id']}/{filename}",
        "type": photo_type,
        "uploaded_by": user["id"],
        "uploaded_at": now
    }
    
    # Update job with photo
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$push": {"photos": photo},
            "$set": {"updated_at": now}
        }
    )
    
    return {"message": "Photo uploaded successfully", "photo": photo}

@api_router.delete("/jobs/{job_id}/photos/{photo_id}")
async def delete_job_photo(
    job_id: str,
    photo_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a photo from a job"""
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Find the photo
    photo = next((p for p in job.get("photos", []) if p["id"] == photo_id), None)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete file from disk
    file_path = UPLOAD_DIR / user["tenant_id"] / photo["filename"]
    if file_path.exists():
        file_path.unlink()
    
    # Remove from database
    now = datetime.now(timezone.utc).isoformat()
    await db.jobs.update_one(
        {"id": job_id},
        {
            "$pull": {"photos": {"id": photo_id}},
            "$set": {"updated_at": now}
        }
    )
    
    return {"message": "Photo deleted successfully"}

# ==================== PUBLIC TRACKING ====================

class PublicJobStatus(BaseModel):
    """Limited job info for public tracking"""
    job_number: str
    status: str
    device_brand: str
    device_model: str
    created_at: str
    updated_at: str
    status_history: List[dict]
    diagnosis_summary: Optional[str] = None
    repair_summary: Optional[str] = None
    company_name: str

@api_router.get("/public/plans")
async def get_public_plans():
    """Public endpoint to get available subscription plans (no auth required)"""
    plans = await db.plans.find(
        {"is_deleted": {"$ne": True}},
        {"_id": 0}
    ).sort("price", 1).to_list(10)
    # Filter out inactive plans
    active_plans = [p for p in plans if p.get("is_active", True) != False]
    return active_plans

@api_router.get("/public/track/{job_number}/{tracking_token}", response_model=PublicJobStatus)
async def public_track_job(job_number: str, tracking_token: str):
    """Public endpoint for customers to track their job status (no auth required)"""
    job = await db.jobs.find_one({
        "job_number": job_number,
        "tracking_token": tracking_token
    }, {"_id": 0})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found. Please check your job number and tracking token.")
    
    # Get company name
    tenant = await db.tenants.find_one({"id": job["tenant_id"]}, {"_id": 0})
    company_name = tenant["company_name"] if tenant else "Unknown"
    
    # Sanitize status history (remove user_id)
    sanitized_history = [
        {
            "status": entry["status"],
            "timestamp": entry["timestamp"],
            "notes": entry.get("notes", "")
        }
        for entry in job.get("status_history", [])
    ]
    
    return PublicJobStatus(
        job_number=job["job_number"],
        status=job["status"],
        device_brand=job["device"]["brand"],
        device_model=job["device"]["model"],
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        status_history=sanitized_history,
        diagnosis_summary=job["diagnosis"]["diagnosis"] if job.get("diagnosis") else None,
        repair_summary=job["repair"]["work_done"] if job.get("repair") else None,
        company_name=company_name
    )

@api_router.get("/jobs/{job_id}/tracking-link")
async def get_tracking_link(job_id: str, user: dict = Depends(get_current_user)):
    """Get the public tracking link for a job"""
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    tracking_token = job.get("tracking_token", "")
    
    return {
        "job_number": job["job_number"],
        "tracking_token": tracking_token,
        "tracking_path": f"/track/{job['job_number']}/{tracking_token}"
    }

# ==================== WHATSAPP MESSAGE ====================

@api_router.get("/jobs/{job_id}/whatsapp-message")
async def get_whatsapp_message(job_id: str, message_type: str = "received", user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    company = tenant["company_name"]
    customer = job["customer"]
    device = job["device"]
    
    # Device details string (always included)
    device_details = f"""📱 *Device Details:*
• Type: {device['device_type']}
• Brand: {device['brand']}
• Model: {device['model']}
• Serial/IMEI: {device['serial_imei']}
• Condition: {device['condition']}"""
    
    checked_accessories = [a["name"] for a in job["accessories"] if a["checked"]]
    accessories_text = ", ".join(checked_accessories) if checked_accessories else "None"
    
    if message_type == "received":
        message = f"""Hello {customer['name']},

Your device has been received at *{company}*.

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

📋 *Problem:* {job['problem_description']}
🎒 *Accessories:* {accessories_text}

We will diagnose and update you shortly.

– *{company}*"""
    
    elif message_type == "diagnosis":
        if not job.get("diagnosis"):
            raise HTTPException(status_code=400, detail="No diagnosis available")
        diag = job["diagnosis"]
        message = f"""Hello {customer['name']},

Diagnosis is complete for your device.

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

🔍 *Diagnosis Report:*
• Issue Found: {diag['diagnosis']}
• Estimated Cost: *₹{diag['estimated_cost']}*
• Timeline: {diag['estimated_timeline']}
{f"• Parts Required: {diag['parts_required']}" if diag.get('parts_required') else ""}

📞 *Please call us or reply to approve the repair.*

– *{company}*"""
    
    elif message_type == "approved":
        if not job.get("approval"):
            raise HTTPException(status_code=400, detail="No approval details available")
        approval = job["approval"]
        message = f"""Hello {customer['name']},

Thank you for approving the repair!

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

✅ *Approval Details:*
• Approved By: {approval['approved_by']}
• Approved Amount: *₹{approval['approved_amount']}*

🔧 Your device repair is now *in progress*. We will update you once it's ready.

– *{company}*"""

    elif message_type == "pending_parts":
        message = f"""Hello {customer['name']},

Update on your repair job.

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

⏳ *Status:* Waiting for Parts

We are waiting for required parts to arrive. We will update you once the repair resumes.

– *{company}*"""
    
    elif message_type == "repaired":
        if not job.get("repair"):
            raise HTTPException(status_code=400, detail="No repair details available")
        repair = job["repair"]
        message = f"""Hello {customer['name']},

Great news! 🎉 Your device has been *repaired* successfully.

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

✅ *Repair Details:*
• Work Done: {repair['work_done']}
{f"• Parts Replaced: {repair['parts_replaced']}" if repair.get('parts_replaced') else ""}
• Final Amount: *₹{repair['final_amount']}*
{f"• Warranty: {repair['warranty_info']}" if repair.get('warranty_info') else ""}

📍 Please visit our shop to collect your device.

– *{company}*"""

    elif message_type == "delivered":
        if not job.get("delivery"):
            raise HTTPException(status_code=400, detail="No delivery details available")
        delivery = job["delivery"]
        message = f"""Hello {customer['name']},

Thank you for your business! 🙏

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

✅ *Delivery Receipt:*
• Delivered To: {delivery['delivered_to']}
• Amount Received: *₹{delivery['amount_received']}*
• Payment Mode: {delivery['payment_mode']}
{f"• Reference: {delivery['payment_reference']}" if delivery.get('payment_reference') else ""}

Thank you for choosing *{company}*. We hope to serve you again!

– *{company}*"""
    
    else:
        # Generic status update
        status_display = job['status'].replace('_', ' ').title()
        message = f"""Hello {customer['name']},

Update on your device.

🎫 *Job Sheet No:* {job['job_number']}

{device_details}

📋 *Status:* {status_display}

– *{company}*"""
    
    # Generate WhatsApp URL
    import urllib.parse
    phone = customer["mobile"].replace("+", "").replace(" ", "")
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone
    
    encoded_message = urllib.parse.quote(message)
    whatsapp_url = f"https://wa.me/{phone}?text={encoded_message}"
    
    return {
        "message": message,
        "whatsapp_url": whatsapp_url,
        "phone": phone
    }

# ==================== SUPER ADMIN MODELS ====================

class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str

class SuperAdminResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    created_at: str

class SuperAdminLoginResponse(BaseModel):
    token: str
    user: SuperAdminResponse

class TenantAdminResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_name: str
    subdomain: str
    settings: dict
    trial_ends_at: str
    is_active: bool = True
    subscription_status: str = "trial"
    subscription_plan: str = "free"
    subscription_ends_at: Optional[str] = None
    created_at: str
    admin_email: Optional[str] = None
    total_jobs: int = 0
    total_users: int = 0

class TenantUpdateByAdmin(BaseModel):
    is_active: Optional[bool] = None
    subscription_status: Optional[str] = None
    subscription_plan: Optional[str] = None
    trial_ends_at: Optional[str] = None
    subscription_ends_at: Optional[str] = None

class TenantCreateByAdmin(BaseModel):
    company_name: str
    subdomain: str
    admin_name: str
    admin_email: EmailStr
    admin_password: str
    subscription_plan: str = "free"
    trial_days: int = 14

# ==================== SUBSCRIPTION PLAN MODELS ====================

# Default plans (used for seeding)
DEFAULT_SUBSCRIPTION_PLANS = [
    {
        "id": "free",
        "name": "Free",
        "description": "Perfect for trying out the platform",
        "price": 0,
        "billing_cycle": "forever",
        "duration_days": 0,
        "max_users": 1,
        "max_branches": 1,
        "max_jobs_per_month": 50,
        "max_inventory_items": 50,
        "max_photos_per_job": 3,
        "max_storage_mb": 100,
        "features": {
            "job_management": True,
            "basic_reports": True,
            "pdf_job_sheet": True,
            "qr_tracking": True,
            "whatsapp_messages": True,
            "photo_upload": True,
            "inventory_management": False,
            "advanced_analytics": False,
            "technician_metrics": False,
            "customer_management": False,
            "email_notifications": False,
            "sms_notifications": False,
            "custom_branding": False,
            "api_access": False,
            "priority_support": False,
            "dedicated_account_manager": False,
            "data_export": False,
            "multi_branch": False
        },
        "is_active": True,
        "is_default": True,
        "sort_order": 1
    },
    {
        "id": "basic",
        "name": "Basic",
        "description": "For small repair shops",
        "price": 499,
        "billing_cycle": "monthly",
        "duration_days": 30,
        "max_users": 3,
        "max_branches": 1,
        "max_jobs_per_month": 200,
        "max_inventory_items": 200,
        "max_photos_per_job": 5,
        "max_storage_mb": 500,
        "features": {
            "job_management": True,
            "basic_reports": True,
            "pdf_job_sheet": True,
            "qr_tracking": True,
            "whatsapp_messages": True,
            "photo_upload": True,
            "inventory_management": True,
            "advanced_analytics": False,
            "technician_metrics": True,
            "customer_management": True,
            "email_notifications": True,
            "sms_notifications": False,
            "custom_branding": False,
            "api_access": False,
            "priority_support": False,
            "dedicated_account_manager": False,
            "data_export": True,
            "multi_branch": False
        },
        "is_active": True,
        "is_default": True,
        "sort_order": 2
    },
    {
        "id": "pro",
        "name": "Pro",
        "description": "For growing businesses",
        "price": 999,
        "billing_cycle": "monthly",
        "duration_days": 30,
        "max_users": 10,
        "max_branches": 3,
        "max_jobs_per_month": -1,
        "max_inventory_items": 1000,
        "max_photos_per_job": 10,
        "max_storage_mb": 2000,
        "features": {
            "job_management": True,
            "basic_reports": True,
            "pdf_job_sheet": True,
            "qr_tracking": True,
            "whatsapp_messages": True,
            "photo_upload": True,
            "inventory_management": True,
            "advanced_analytics": True,
            "technician_metrics": True,
            "customer_management": True,
            "email_notifications": True,
            "sms_notifications": True,
            "custom_branding": True,
            "api_access": False,
            "priority_support": True,
            "dedicated_account_manager": False,
            "data_export": True,
            "multi_branch": True
        },
        "is_active": True,
        "is_default": True,
        "sort_order": 3
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "description": "For large organizations",
        "price": 2499,
        "billing_cycle": "monthly",
        "duration_days": 30,
        "max_users": -1,
        "max_branches": -1,
        "max_jobs_per_month": -1,
        "max_inventory_items": -1,
        "max_photos_per_job": -1,
        "max_storage_mb": -1,
        "features": {
            "job_management": True,
            "basic_reports": True,
            "pdf_job_sheet": True,
            "qr_tracking": True,
            "whatsapp_messages": True,
            "photo_upload": True,
            "inventory_management": True,
            "advanced_analytics": True,
            "technician_metrics": True,
            "customer_management": True,
            "email_notifications": True,
            "sms_notifications": True,
            "custom_branding": True,
            "api_access": True,
            "priority_support": True,
            "dedicated_account_manager": True,
            "data_export": True,
            "multi_branch": True
        },
        "is_active": True,
        "is_default": True,
        "sort_order": 4
    }
]

# Feature descriptions for UI
FEATURE_DESCRIPTIONS = {
    "job_management": "Create and manage repair jobs",
    "basic_reports": "View basic job and revenue reports",
    "pdf_job_sheet": "Generate PDF job sheets",
    "qr_tracking": "QR code for customer tracking",
    "whatsapp_messages": "Send WhatsApp messages to customers",
    "photo_upload": "Upload device photos",
    "inventory_management": "Track parts and spares inventory",
    "advanced_analytics": "Detailed analytics and charts",
    "technician_metrics": "Technician performance tracking",
    "customer_management": "Customer history and CRM",
    "email_notifications": "Email alerts for job updates",
    "sms_notifications": "SMS alerts for job updates",
    "custom_branding": "Custom logo and branding",
    "api_access": "REST API access for integrations",
    "priority_support": "Priority customer support",
    "dedicated_account_manager": "Dedicated account manager",
    "data_export": "Export data to CSV/Excel",
    "multi_branch": "Multi-branch support"
}

class SubscriptionPlanCreate(BaseModel):
    id: str  # Unique slug (e.g., "starter", "growth")
    name: str
    description: Optional[str] = None
    price: float
    billing_cycle: str = "monthly"  # monthly, yearly, forever
    duration_days: int = 30
    max_users: int = 1  # -1 for unlimited
    max_branches: int = 1  # -1 for unlimited
    max_jobs_per_month: int = 100  # -1 for unlimited
    max_inventory_items: int = 100  # -1 for unlimited
    max_photos_per_job: int = 5  # -1 for unlimited
    max_storage_mb: int = 500  # -1 for unlimited
    features: dict = {}
    is_active: bool = True
    sort_order: int = 99

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    duration_days: Optional[int] = None
    max_users: Optional[int] = None
    max_branches: Optional[int] = None
    max_jobs_per_month: Optional[int] = None
    max_inventory_items: Optional[int] = None
    max_photos_per_job: Optional[int] = None
    max_storage_mb: Optional[int] = None
    features: Optional[dict] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class SubscriptionPlanResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    price: float
    billing_cycle: str
    duration_days: int
    max_users: int
    max_branches: int
    max_jobs_per_month: int
    max_inventory_items: int
    max_photos_per_job: int
    max_storage_mb: int
    features: dict
    is_active: bool
    is_default: bool = False
    sort_order: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    tenant_count: int = 0

class AssignPlanRequest(BaseModel):
    plan: str  # plan id
    duration_months: int = 1
    notes: Optional[str] = None

class ExtendValidityRequest(BaseModel):
    days: int
    reason: Optional[str] = None

class RecordPaymentRequest(BaseModel):
    amount: float
    payment_mode: str  # cash, bank_transfer, upi, cheque, card
    reference_number: Optional[str] = None
    plan: Optional[str] = None
    duration_months: int = 1
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tenant_id: str
    amount: float
    payment_mode: str
    reference_number: Optional[str] = None
    plan: Optional[str] = None
    duration_months: int = 1
    notes: Optional[str] = None
    recorded_by: str
    created_at: str

# ==================== SUPER ADMIN HELPERS ====================

def create_super_admin_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "is_super_admin": True,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_super_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("is_super_admin"):
            raise HTTPException(status_code=403, detail="Super admin access required")
        user = await db.super_admins.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Super admin not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== SUPER ADMIN ROUTES ====================

@api_router.post("/super-admin/login", response_model=SuperAdminLoginResponse)
async def super_admin_login(data: SuperAdminLogin):
    user = await db.super_admins.find_one({"email": data.email.lower()})
    
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_super_admin_token(user["id"], user["role"])
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    
    return SuperAdminLoginResponse(token=token, user=SuperAdminResponse(**user_response))

@api_router.get("/super-admin/me", response_model=SuperAdminResponse)
async def get_super_admin_me(admin: dict = Depends(get_super_admin)):
    return SuperAdminResponse(**admin)

@api_router.post("/super-admin/change-password")
async def change_super_admin_password(data: ChangePasswordRequest, admin: dict = Depends(get_super_admin)):
    """Change password for logged-in super admin"""
    # Get super admin from database to verify current password
    db_admin = await db.super_admins.find_one({"id": admin["id"]})
    if not db_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Verify current password
    if not verify_password(data.current_password, db_admin["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.super_admins.update_one(
        {"id": admin["id"]},
        {"$set": {"password": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.get("/super-admin/stats")
async def get_platform_stats(admin: dict = Depends(get_super_admin)):
    total_tenants = await db.tenants.count_documents({})
    active_tenants = await db.tenants.count_documents({"is_active": {"$ne": False}})
    total_users = await db.users.count_documents({})
    total_jobs = await db.jobs.count_documents({})
    
    # Jobs by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(10)
    jobs_by_status = {item["_id"]: item["count"] for item in status_counts}
    
    # Recent signups (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_signups = await db.tenants.count_documents({"created_at": {"$gte": week_ago}})
    
    # Trial vs paid
    trial_tenants = await db.tenants.count_documents({"subscription_status": {"$in": ["trial", None]}})
    paid_tenants = await db.tenants.count_documents({"subscription_status": "paid"})
    
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "inactive_tenants": total_tenants - active_tenants,
        "trial_tenants": trial_tenants,
        "paid_tenants": paid_tenants,
        "total_users": total_users,
        "total_jobs": total_jobs,
        "jobs_by_status": jobs_by_status,
        "recent_signups": recent_signups
    }

@api_router.get("/super-admin/tenants", response_model=List[TenantAdminResponse])
async def get_all_tenants(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    admin: dict = Depends(get_super_admin)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"subdomain": {"$regex": search, "$options": "i"}}
        ]
    
    if status_filter == "active":
        query["is_active"] = {"$ne": False}
    elif status_filter == "inactive":
        query["is_active"] = False
    elif status_filter == "trial":
        query["subscription_status"] = {"$in": ["trial", None]}
    elif status_filter == "paid":
        query["subscription_status"] = "paid"
    
    tenants = await db.tenants.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with additional data
    result = []
    for tenant in tenants:
        # Get admin email
        admin_user = await db.users.find_one(
            {"tenant_id": tenant["id"], "role": "admin"},
            {"email": 1, "_id": 0}
        )
        
        # Get counts
        total_jobs = await db.jobs.count_documents({"tenant_id": tenant["id"]})
        total_users = await db.users.count_documents({"tenant_id": tenant["id"]})
        
        tenant_data = {
            **tenant,
            "is_active": tenant.get("is_active", True),
            "subscription_status": tenant.get("subscription_status", "trial"),
            "subscription_plan": tenant.get("subscription_plan", "free"),
            "subscription_ends_at": tenant.get("subscription_ends_at"),
            "admin_email": admin_user["email"] if admin_user else None,
            "total_jobs": total_jobs,
            "total_users": total_users
        }
        result.append(TenantAdminResponse(**tenant_data))
    
    return result

@api_router.get("/super-admin/tenants/{tenant_id}")
async def get_tenant_details(tenant_id: str, admin: dict = Depends(get_super_admin)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get all users
    users = await db.users.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    # Get all branches
    branches = await db.branches.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    
    # Get job stats
    total_jobs = await db.jobs.count_documents({"tenant_id": tenant_id})
    
    # Get this month's jobs count
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    this_month_jobs = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": month_start}
    })
    
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(10)
    jobs_by_status = {item["_id"]: item["count"] for item in status_counts}
    
    # Get inventory count
    total_inventory = await db.inventory.count_documents({"tenant_id": tenant_id})
    
    # Get total photos count
    total_photos = await db.photos.count_documents({"tenant_id": tenant_id})
    
    # Get customers count
    total_customers = await db.jobs.aggregate([
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$customer.phone"}},
        {"$count": "total"}
    ]).to_list(1)
    customers_count = total_customers[0]["total"] if total_customers else 0
    
    # Recent jobs
    recent_jobs = await db.jobs.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "job_number": 1, "customer": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Get payment history from tenant_payments collection
    payments = await db.tenant_payments.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Calculate total revenue from this tenant
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    # Get action logs
    action_logs = await db.admin_action_logs.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "tenant": {
            **tenant,
            "is_active": tenant.get("is_active", True),
            "subscription_status": tenant.get("subscription_status", "trial"),
            "subscription_plan": tenant.get("subscription_plan", "free"),
            "subscription_ends_at": tenant.get("subscription_ends_at")
        },
        "users": users,
        "branches": branches,
        "stats": {
            "total_jobs": total_jobs,
            "this_month_jobs": this_month_jobs,
            "jobs_by_status": jobs_by_status,
            "total_inventory": total_inventory,
            "total_photos": total_photos,
            "total_customers": customers_count,
            "total_paid": total_paid
        },
        "recent_jobs": recent_jobs,
        "payments": payments,
        "action_logs": action_logs
    }

@api_router.put("/super-admin/tenants/{tenant_id}")
async def update_tenant_by_admin(
    tenant_id: str,
    data: TenantUpdateByAdmin,
    admin: dict = Depends(get_super_admin)
):
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if update_data:
        await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    
    updated_tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return {
        **updated_tenant,
        "is_active": updated_tenant.get("is_active", True),
        "subscription_status": updated_tenant.get("subscription_status", "trial"),
        "subscription_plan": updated_tenant.get("subscription_plan", "free")
    }

@api_router.post("/super-admin/tenants")
async def create_tenant_by_admin(
    data: TenantCreateByAdmin,
    admin: dict = Depends(get_super_admin)
):
    """Create a new tenant (shop) from Super Admin panel"""
    # Check if subdomain is taken
    existing = await db.tenants.find_one({"subdomain": data.subdomain.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already taken")
    
    # Check if email is taken
    existing_email = await db.users.find_one({"email": data.admin_email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    trial_ends = (datetime.now(timezone.utc) + timedelta(days=data.trial_days)).isoformat()
    
    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = {
        "id": tenant_id,
        "company_name": data.company_name,
        "subdomain": data.subdomain.lower(),
        "settings": {
            "theme": "light",
            "language": "en",
            "logo_url": None,
            "address": "",
            "phone": "",
            "email": data.admin_email,
            "footer_text": f"Thank you for choosing {data.company_name}"
        },
        "subscription_plan": data.subscription_plan,
        "subscription_status": "trial",
        "is_active": True,
        "trial_ends_at": trial_ends,
        "created_at": now
    }
    await db.tenants.insert_one(tenant)
    
    # Create admin user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "tenant_id": tenant_id,
        "name": data.admin_name,
        "email": data.admin_email.lower(),
        "password": hash_password(data.admin_password),
        "role": "admin",
        "branch_id": None,
        "created_at": now
    }
    await db.users.insert_one(user)
    
    # Create default branch
    branch_id = str(uuid.uuid4())
    branch = {
        "id": branch_id,
        "tenant_id": tenant_id,
        "name": "Main Branch",
        "address": "",
        "phone": "",
        "created_at": now
    }
    await db.branches.insert_one(branch)
    
    # Log the action
    await db.admin_action_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin["email"],
        "tenant_id": tenant_id,
        "action": "create_tenant",
        "details": {
            "company_name": data.company_name,
            "subdomain": data.subdomain,
            "admin_email": data.admin_email,
            "plan": data.subscription_plan
        },
        "created_at": now
    })
    
    return {
        "message": "Shop created successfully",
        "tenant": {
            "id": tenant_id,
            "company_name": data.company_name,
            "subdomain": data.subdomain,
            "admin_email": data.admin_email
        }
    }

@api_router.get("/super-admin/analytics")
async def get_super_admin_analytics(admin: dict = Depends(get_super_admin)):
    """Get platform-wide analytics including revenue and billing"""
    now = datetime.now(timezone.utc)
    
    # Time periods
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Revenue calculations from payments
    total_revenue_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_revenue_result = await db.tenant_payments.aggregate(total_revenue_pipeline).to_list(1)
    total_revenue = total_revenue_result[0]["total"] if total_revenue_result else 0
    
    # Monthly revenue
    monthly_revenue_pipeline = [
        {"$match": {"created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    monthly_revenue_result = await db.tenant_payments.aggregate(monthly_revenue_pipeline).to_list(1)
    monthly_revenue = monthly_revenue_result[0]["total"] if monthly_revenue_result else 0
    
    # Revenue by month (last 12 months)
    twelve_months_ago = (now - timedelta(days=365)).isoformat()
    revenue_by_month_pipeline = [
        {"$match": {"created_at": {"$gte": twelve_months_ago}}},
        {"$addFields": {
            "month": {"$substr": ["$created_at", 0, 7]}
        }},
        {"$group": {
            "_id": "$month",
            "revenue": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    revenue_by_month = await db.tenant_payments.aggregate(revenue_by_month_pipeline).to_list(12)
    
    # Revenue by payment mode
    revenue_by_mode_pipeline = [
        {"$group": {
            "_id": "$payment_mode",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    revenue_by_mode = await db.tenant_payments.aggregate(revenue_by_mode_pipeline).to_list(10)
    
    # Plan distribution
    plan_distribution_pipeline = [
        {"$group": {
            "_id": {"$ifNull": ["$subscription_plan", "free"]},
            "count": {"$sum": 1}
        }}
    ]
    plan_distribution = await db.tenants.aggregate(plan_distribution_pipeline).to_list(10)
    
    # Subscription status distribution
    status_distribution_pipeline = [
        {"$group": {
            "_id": {"$ifNull": ["$subscription_status", "trial"]},
            "count": {"$sum": 1}
        }}
    ]
    status_distribution = await db.tenants.aggregate(status_distribution_pipeline).to_list(10)
    
    # New signups trend (last 30 days)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    signups_trend_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    signups_trend = await db.tenants.aggregate(signups_trend_pipeline).to_list(30)
    
    # Jobs trend (last 30 days)
    jobs_trend_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    jobs_trend = await db.jobs.aggregate(jobs_trend_pipeline).to_list(30)
    
    # Top tenants by jobs
    top_tenants_pipeline = [
        {"$group": {
            "_id": "$tenant_id",
            "job_count": {"$sum": 1}
        }},
        {"$sort": {"job_count": -1}},
        {"$limit": 10}
    ]
    top_tenants_by_jobs = await db.jobs.aggregate(top_tenants_pipeline).to_list(10)
    
    # Enrich top tenants with names
    for t in top_tenants_by_jobs:
        tenant = await db.tenants.find_one({"id": t["_id"]}, {"company_name": 1, "subdomain": 1, "_id": 0})
        if tenant:
            t["company_name"] = tenant.get("company_name", "Unknown")
            t["subdomain"] = tenant.get("subdomain", "unknown")
    
    # Recent payments
    recent_payments = await db.tenant_payments.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Enrich recent payments with tenant info
    for payment in recent_payments:
        tenant = await db.tenants.find_one({"id": payment.get("tenant_id")}, {"company_name": 1, "_id": 0})
        payment["company_name"] = tenant.get("company_name", "Unknown") if tenant else "Unknown"
    
    # Expiring subscriptions (next 30 days)
    next_30_days = (now + timedelta(days=30)).isoformat()
    expiring_soon = await db.tenants.find(
        {
            "subscription_status": "paid",
            "subscription_ends_at": {"$lte": next_30_days, "$gte": now.isoformat()}
        },
        {"_id": 0, "id": 1, "company_name": 1, "subdomain": 1, "subscription_ends_at": 1, "subscription_plan": 1}
    ).sort("subscription_ends_at", 1).limit(10).to_list(10)
    
    return {
        "revenue": {
            "total": total_revenue,
            "monthly": monthly_revenue,
            "by_month": revenue_by_month,
            "by_payment_mode": revenue_by_mode
        },
        "tenants": {
            "plan_distribution": plan_distribution,
            "status_distribution": status_distribution,
            "signups_trend": signups_trend,
            "top_by_jobs": top_tenants_by_jobs,
            "expiring_soon": expiring_soon
        },
        "jobs": {
            "trend": jobs_trend
        },
        "recent_payments": recent_payments
    }

# ==================== LOGIN AS SHOP (IMPERSONATION) ====================

@api_router.post("/super-admin/tenants/{tenant_id}/impersonate")
async def impersonate_tenant(tenant_id: str, admin: dict = Depends(get_super_admin)):
    """Generate a token to login as a shop admin"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get the admin user of this tenant
    admin_user = await db.users.find_one({"tenant_id": tenant_id, "role": "admin"})
    if not admin_user:
        raise HTTPException(status_code=404, detail="No admin user found for this tenant")
    
    # Create a token for the admin user
    token = jwt.encode({
        "user_id": admin_user["id"],
        "tenant_id": tenant_id,
        "role": "admin",
        "impersonated_by": admin["id"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }, JWT_SECRET, algorithm="HS256")
    
    # Log the action
    now = datetime.now(timezone.utc).isoformat()
    await db.admin_action_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin["email"],
        "tenant_id": tenant_id,
        "action": "impersonate",
        "details": {"reason": "Super admin login as shop"},
        "created_at": now
    })
    
    return {
        "token": token,
        "user": {
            "id": admin_user["id"],
            "name": admin_user.get("name", ""),
            "email": admin_user["email"],
            "role": admin_user["role"],
            "tenant_id": tenant_id
        },
        "tenant": {
            "id": tenant["id"],
            "company_name": tenant["company_name"],
            "subdomain": tenant["subdomain"]
        }
    }

# ==================== SUSPEND/UNSUSPEND SHOP ====================

class SuspendTenantRequest(BaseModel):
    reason: str
    notify_admin: bool = True

@api_router.post("/super-admin/tenants/{tenant_id}/suspend")
async def suspend_tenant(
    tenant_id: str, 
    data: SuspendTenantRequest,
    admin: dict = Depends(get_super_admin)
):
    """Suspend a shop with reason"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "is_active": False,
            "suspended_at": now,
            "suspension_reason": data.reason,
            "suspended_by": admin["id"]
        }}
    )
    
    # Log the action
    await db.admin_action_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin["email"],
        "tenant_id": tenant_id,
        "action": "suspend",
        "details": {"reason": data.reason, "notify_admin": data.notify_admin},
        "created_at": now
    })
    
    return {"message": "Shop suspended successfully", "reason": data.reason}

@api_router.post("/super-admin/tenants/{tenant_id}/unsuspend")
async def unsuspend_tenant(
    tenant_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Unsuspend a shop"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {
            "$set": {"is_active": True, "unsuspended_at": now},
            "$unset": {"suspended_at": "", "suspension_reason": "", "suspended_by": ""}
        }
    )
    
    # Log the action
    await db.admin_action_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin["email"],
        "tenant_id": tenant_id,
        "action": "unsuspend",
        "details": {},
        "created_at": now
    })
    
    return {"message": "Shop unsuspended successfully"}

# ==================== PASSWORD RESET ====================

class ResetPasswordRequest(BaseModel):
    new_password: str

@api_router.post("/super-admin/tenants/{tenant_id}/users/{user_id}/reset-password")
async def reset_user_password(
    tenant_id: str,
    user_id: str,
    data: ResetPasswordRequest,
    admin: dict = Depends(get_super_admin)
):
    """Reset a shop user's password"""
    # Verify tenant exists
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Verify user exists and belongs to tenant
    user = await db.users.find_one({"id": user_id, "tenant_id": tenant_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hash}}
    )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Log the action
    await db.admin_action_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin["email"],
        "tenant_id": tenant_id,
        "action": "reset_password",
        "details": {
            "user_id": user_id,
            "user_email": user["email"],
            "user_name": user["name"]
        },
        "created_at": now
    })
    
    return {
        "message": "Password reset successfully",
        "user_email": user["email"]
    }

# ==================== ANNOUNCEMENTS ====================

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str = "info"  # info, warning, urgent
    target: str = "all"  # all, active, trial, paid
    expires_at: Optional[str] = None

@api_router.get("/super-admin/announcements")
async def get_announcements(admin: dict = Depends(get_super_admin)):
    """Get all announcements"""
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return announcements

@api_router.post("/super-admin/announcements")
async def create_announcement(
    data: AnnouncementCreate,
    admin: dict = Depends(get_super_admin)
):
    """Create a new announcement"""
    now = datetime.now(timezone.utc).isoformat()
    
    announcement = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "content": data.content,
        "type": data.type,
        "target": data.target,
        "expires_at": data.expires_at,
        "created_by": admin["id"],
        "created_at": now,
        "is_active": True
    }
    
    await db.announcements.insert_one(announcement)
    
    return {"message": "Announcement created", "announcement": {k: v for k, v in announcement.items() if k != "_id"}}

@api_router.delete("/super-admin/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Delete an announcement"""
    result = await db.announcements.delete_one({"id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}

# Tenant endpoint to get announcements
@api_router.get("/announcements")
async def get_tenant_announcements(user: dict = Depends(get_current_user)):
    """Get announcements for the logged-in tenant"""
    tenant = await db.tenants.find_one({"id": user["tenant_id"]})
    if not tenant:
        return []
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Build query based on tenant status
    query = {
        "is_active": True,
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": now}}
        ]
    }
    
    # Filter by target
    status = tenant.get("subscription_status", "trial")
    target_filter = {"$or": [
        {"target": "all"},
        {"target": status}
    ]}
    query.update(target_filter)
    
    announcements = await db.announcements.find(query, {"_id": 0}).sort("created_at", -1).to_list(10)
    return announcements

# ==================== SUPPORT TICKETS ====================

class TicketCreate(BaseModel):
    subject: str
    message: str
    priority: str = "normal"  # low, normal, high, urgent

class TicketReply(BaseModel):
    message: str

@api_router.get("/super-admin/tickets")
async def get_all_tickets(
    status: str = "all",
    admin: dict = Depends(get_super_admin)
):
    """Get all support tickets"""
    query = {} if status == "all" else {"status": status}
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with tenant info
    for ticket in tickets:
        tenant = await db.tenants.find_one({"id": ticket.get("tenant_id")}, {"company_name": 1, "subdomain": 1, "_id": 0})
        ticket["company_name"] = tenant.get("company_name", "Unknown") if tenant else "Unknown"
        ticket["subdomain"] = tenant.get("subdomain", "unknown") if tenant else "unknown"
    
    return tickets

@api_router.post("/super-admin/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    data: TicketReply,
    admin: dict = Depends(get_super_admin)
):
    """Reply to a support ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    reply = {
        "id": str(uuid.uuid4()),
        "message": data.message,
        "from": "admin",
        "admin_id": admin["id"],
        "admin_name": admin.get("name", "Super Admin"),
        "created_at": now
    }
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"replies": reply},
            "$set": {"status": "replied", "updated_at": now}
        }
    )
    
    return {"message": "Reply sent", "reply": reply}

@api_router.post("/super-admin/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Close a support ticket"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "closed", "closed_at": now, "closed_by": admin["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket closed"}

# Tenant endpoint to create ticket
@api_router.post("/tickets")
async def create_ticket(
    data: TicketCreate,
    user: dict = Depends(get_current_user)
):
    """Create a support ticket"""
    now = datetime.now(timezone.utc).isoformat()
    
    ticket = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "user_id": user["id"],
        "user_email": user["email"],
        "subject": data.subject,
        "message": data.message,
        "priority": data.priority,
        "status": "open",
        "replies": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.support_tickets.insert_one(ticket)
    
    return {"message": "Ticket created", "ticket": {k: v for k, v in ticket.items() if k != "_id"}}

@api_router.get("/tickets")
async def get_my_tickets(user: dict = Depends(get_current_user)):
    """Get tickets for the current tenant"""
    tickets = await db.support_tickets.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return tickets

@api_router.post("/tickets/{ticket_id}/reply")
async def tenant_reply_to_ticket(
    ticket_id: str,
    data: TicketReply,
    user: dict = Depends(get_current_user)
):
    """Tenant reply to their own ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id, "tenant_id": user["tenant_id"]})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    reply = {
        "id": str(uuid.uuid4()),
        "message": data.message,
        "from": "tenant",
        "user_id": user["id"],
        "user_email": user["email"],
        "created_at": now
    }
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"replies": reply},
            "$set": {"status": "open", "updated_at": now}
        }
    )
    
    return {"message": "Reply sent", "reply": reply}

# ==================== WHATSAPP ALERTS FOR EXPIRING SUBSCRIPTIONS ====================

@api_router.get("/super-admin/expiring-subscriptions")
async def get_expiring_subscriptions(
    days: int = 7,
    admin: dict = Depends(get_super_admin)
):
    """Get shops with expiring subscriptions and generate WhatsApp messages"""
    now = datetime.now(timezone.utc)
    future_date = (now + timedelta(days=days)).isoformat()
    
    expiring = await db.tenants.find(
        {
            "subscription_status": "paid",
            "subscription_ends_at": {"$lte": future_date, "$gte": now.isoformat()},
            "is_active": True
        },
        {"_id": 0}
    ).sort("subscription_ends_at", 1).to_list(100)
    
    # Enrich with admin contact and WhatsApp link
    for tenant in expiring:
        admin_user = await db.users.find_one(
            {"tenant_id": tenant["id"], "role": "admin"},
            {"_id": 0, "name": 1, "email": 1}
        )
        tenant["admin_name"] = admin_user.get("name", "Admin") if admin_user else "Admin"
        tenant["admin_email"] = admin_user.get("email", "") if admin_user else ""
        
        # Get phone from tenant settings
        phone = tenant.get("settings", {}).get("phone", "")
        tenant["phone"] = phone
        
        # Calculate days remaining
        if tenant.get("subscription_ends_at"):
            try:
                ends_at = datetime.fromisoformat(tenant["subscription_ends_at"].replace("Z", "+00:00"))
                days_remaining = (ends_at - now).days
                tenant["days_remaining"] = days_remaining
            except:
                tenant["days_remaining"] = 0
        
        # Generate WhatsApp message
        message = f"""Hi {tenant['admin_name']},

Your subscription for *{tenant['company_name']}* on AfterSales.pro is expiring in {tenant.get('days_remaining', 0)} days.

Please renew to continue using all features without interruption.

Renew now to avoid any service disruption.

Thank you,
AfterSales.pro Team"""
        
        tenant["whatsapp_message"] = message
        if phone:
            clean_phone = phone.replace(" ", "").replace("-", "").replace("+", "")
            if not clean_phone.startswith("91") and len(clean_phone) == 10:
                clean_phone = "91" + clean_phone
            tenant["whatsapp_link"] = f"https://wa.me/{clean_phone}?text={message.replace(' ', '%20').replace(chr(10), '%0A')}"
        else:
            tenant["whatsapp_link"] = None
    
    return expiring

# ==================== SUBSCRIPTION MANAGEMENT ROUTES ====================

async def get_plans_from_db() -> dict:
    """Helper to get plans from database or seed defaults"""
    plans = await db.subscription_plans.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    if not plans:
        # Seed default plans if none exist
        now = datetime.now(timezone.utc).isoformat()
        for plan in DEFAULT_SUBSCRIPTION_PLANS:
            plan["created_at"] = now
            plan["updated_at"] = now
            await db.subscription_plans.insert_one(plan)
        plans = DEFAULT_SUBSCRIPTION_PLANS
    return {p["id"]: p for p in plans}

async def get_all_plans_from_db(include_inactive: bool = False) -> list:
    """Get all plans including inactive ones"""
    query = {} if include_inactive else {"is_active": True}
    plans = await db.subscription_plans.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    if not plans:
        now = datetime.now(timezone.utc).isoformat()
        for plan in DEFAULT_SUBSCRIPTION_PLANS:
            plan["created_at"] = now
            plan["updated_at"] = now
            await db.subscription_plans.insert_one(plan)
        plans = DEFAULT_SUBSCRIPTION_PLANS
    
    # Add tenant count for each plan
    for plan in plans:
        plan["tenant_count"] = await db.tenants.count_documents({"subscription_plan": plan["id"]})
    
    return plans

@api_router.get("/super-admin/plans")
async def get_subscription_plans(
    include_inactive: bool = False,
    admin: dict = Depends(get_super_admin)
):
    """Get all subscription plans"""
    plans = await get_all_plans_from_db(include_inactive)
    return plans

@api_router.get("/super-admin/plans/{plan_id}")
async def get_subscription_plan(
    plan_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Get a specific subscription plan"""
    plan = await db.subscription_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan["tenant_count"] = await db.tenants.count_documents({"subscription_plan": plan_id})
    return plan

@api_router.post("/super-admin/plans")
async def create_subscription_plan(
    data: SubscriptionPlanCreate,
    admin: dict = Depends(get_super_admin)
):
    """Create a new subscription plan"""
    # Check if plan ID already exists
    existing = await db.subscription_plans.find_one({"id": data.id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Plan with ID '{data.id}' already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    plan = data.model_dump()
    plan["is_default"] = False
    plan["created_at"] = now
    plan["updated_at"] = now
    
    await db.subscription_plans.insert_one(plan)
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "action": "plan_created",
        "plan_id": data.id,
        "plan_name": data.name,
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": now
    }
    await db.admin_action_logs.insert_one(action_log)
    
    return {"message": f"Plan '{data.name}' created successfully", "plan": {k: v for k, v in plan.items() if k != "_id"}}

@api_router.put("/super-admin/plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    data: SubscriptionPlanUpdate,
    admin: dict = Depends(get_super_admin)
):
    """Update an existing subscription plan"""
    plan = await db.subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.subscription_plans.update_one({"id": plan_id}, {"$set": update_data})
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "action": "plan_updated",
        "plan_id": plan_id,
        "changes": list(update_data.keys()),
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_action_logs.insert_one(action_log)
    
    updated_plan = await db.subscription_plans.find_one({"id": plan_id}, {"_id": 0})
    return {"message": "Plan updated successfully", "plan": updated_plan}

@api_router.delete("/super-admin/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Delete a subscription plan (soft delete by setting is_active=False)"""
    plan = await db.subscription_plans.find_one({"id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default plans")
    
    # Check if any tenants are using this plan
    tenant_count = await db.tenants.count_documents({"subscription_plan": plan_id})
    if tenant_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete plan. {tenant_count} tenant(s) are currently using this plan. Reassign them first."
        )
    
    # Soft delete
    await db.subscription_plans.update_one(
        {"id": plan_id}, 
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "action": "plan_deleted",
        "plan_id": plan_id,
        "plan_name": plan.get("name"),
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_action_logs.insert_one(action_log)
    
    return {"message": f"Plan '{plan.get('name')}' deleted successfully"}

@api_router.get("/super-admin/feature-options")
async def get_feature_options(admin: dict = Depends(get_super_admin)):
    """Get all available feature options with descriptions"""
    return FEATURE_DESCRIPTIONS

# ==================== SUPER ADMIN LEGAL PAGES ====================

@api_router.get("/super-admin/legal-pages")
async def get_super_admin_legal_pages(admin: dict = Depends(get_super_admin)):
    """Get all global legal pages for super admin"""
    # Get from platform_settings collection or return defaults
    settings = await db.platform_settings.find_one({"type": "legal_pages"}, {"_id": 0})
    
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    if settings:
        return {
            "privacy_policy": settings.get("privacy_policy", DEFAULT_LEGAL_PAGES["privacy_policy"].replace("{date}", today)),
            "terms_of_service": settings.get("terms_of_service", DEFAULT_LEGAL_PAGES["terms_of_service"].replace("{date}", today)),
            "refund_policy": settings.get("refund_policy", DEFAULT_LEGAL_PAGES["refund_policy"].replace("{date}", today)),
            "disclaimer": settings.get("disclaimer", DEFAULT_LEGAL_PAGES["disclaimer"].replace("{date}", today)),
            "privacy_enabled": settings.get("privacy_enabled", True),
            "terms_enabled": settings.get("terms_enabled", True),
            "refund_enabled": settings.get("refund_enabled", True),
            "disclaimer_enabled": settings.get("disclaimer_enabled", True)
        }
    
    return {
        "privacy_policy": DEFAULT_LEGAL_PAGES["privacy_policy"].replace("{date}", today),
        "terms_of_service": DEFAULT_LEGAL_PAGES["terms_of_service"].replace("{date}", today),
        "refund_policy": DEFAULT_LEGAL_PAGES["refund_policy"].replace("{date}", today),
        "disclaimer": DEFAULT_LEGAL_PAGES["disclaimer"].replace("{date}", today),
        "privacy_enabled": True,
        "terms_enabled": True,
        "refund_enabled": True,
        "disclaimer_enabled": True
    }

@api_router.put("/super-admin/legal-pages/{page_type}")
async def update_super_admin_legal_page(
    page_type: str,
    data: LegalPageUpdate,
    admin: dict = Depends(get_super_admin)
):
    """Update a global legal page"""
    valid_pages = ["privacy_policy", "terms_of_service", "refund_policy", "disclaimer"]
    if page_type not in valid_pages:
        raise HTTPException(status_code=400, detail="Invalid page type")
    
    enabled_key = page_type.replace("_policy", "_enabled").replace("_of_service", "_enabled")
    if page_type == "terms_of_service":
        enabled_key = "terms_enabled"
    elif page_type == "privacy_policy":
        enabled_key = "privacy_enabled"
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Upsert platform settings
    await db.platform_settings.update_one(
        {"type": "legal_pages"},
        {
            "$set": {
                page_type: data.content,
                enabled_key: data.is_enabled,
                "updated_at": now,
                "updated_by": admin["id"]
            },
            "$setOnInsert": {"type": "legal_pages", "created_at": now}
        },
        upsert=True
    )
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "action": "legal_page_updated",
        "page_type": page_type,
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": now
    }
    await db.admin_action_logs.insert_one(action_log)
    
    return {"message": f"{page_type.replace('_', ' ').title()} updated successfully"}

@api_router.post("/super-admin/tenants/{tenant_id}/assign-plan")
async def assign_plan_to_tenant(
    tenant_id: str,
    data: AssignPlanRequest,
    admin: dict = Depends(get_super_admin)
):
    """Manually assign a subscription plan to a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get plan from database
    plan_info = await db.subscription_plans.find_one({"id": data.plan, "is_active": True}, {"_id": 0})
    if not plan_info:
        raise HTTPException(status_code=400, detail=f"Invalid plan: '{data.plan}' not found or inactive")
    
    now = datetime.now(timezone.utc)
    
    # Calculate subscription end date based on plan duration
    if plan_info["price"] == 0:
        subscription_ends_at = None
        subscription_status = "free"
    else:
        duration_days = plan_info["duration_days"] * data.duration_months
        subscription_ends_at = (now + timedelta(days=duration_days)).isoformat()
        subscription_status = "paid"
    
    update_data = {
        "subscription_plan": data.plan,
        "subscription_status": subscription_status,
        "subscription_ends_at": subscription_ends_at,
        "updated_at": now.isoformat()
    }
    
    await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "action": "plan_assigned",
        "plan": data.plan,
        "duration_months": data.duration_months,
        "notes": data.notes,
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": now.isoformat()
    }
    await db.admin_action_logs.insert_one(action_log)
    
    updated_tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return {
        "message": f"Plan '{plan_info['name']}' assigned successfully",
        "tenant": {
            **updated_tenant,
            "subscription_plan": updated_tenant.get("subscription_plan", "free"),
            "subscription_status": updated_tenant.get("subscription_status", "trial")
        }
    }

@api_router.post("/super-admin/tenants/{tenant_id}/extend-validity")
async def extend_tenant_validity(
    tenant_id: str,
    data: ExtendValidityRequest,
    admin: dict = Depends(get_super_admin)
):
    """Extend trial or subscription validity for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    now = datetime.now(timezone.utc)
    
    # Extend trial_ends_at if in trial
    if tenant.get("subscription_status", "trial") == "trial":
        current_end = tenant.get("trial_ends_at")
        if current_end:
            try:
                end_date = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
            except:
                end_date = now
        else:
            end_date = now
        
        # If already expired, start from now
        if end_date < now:
            end_date = now
        
        new_end = (end_date + timedelta(days=data.days)).isoformat()
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {"trial_ends_at": new_end, "updated_at": now.isoformat()}}
        )
        field_extended = "trial_ends_at"
    else:
        # Extend subscription_ends_at for paid plans
        current_end = tenant.get("subscription_ends_at")
        if current_end:
            try:
                end_date = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
            except:
                end_date = now
        else:
            end_date = now
        
        if end_date < now:
            end_date = now
        
        new_end = (end_date + timedelta(days=data.days)).isoformat()
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {"subscription_ends_at": new_end, "updated_at": now.isoformat()}}
        )
        field_extended = "subscription_ends_at"
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "action": "validity_extended",
        "days": data.days,
        "field_extended": field_extended,
        "new_end_date": new_end,
        "reason": data.reason,
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": now.isoformat()
    }
    await db.admin_action_logs.insert_one(action_log)
    
    updated_tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return {
        "message": f"Validity extended by {data.days} days",
        "new_end_date": new_end,
        "tenant": updated_tenant
    }

@api_router.post("/super-admin/tenants/{tenant_id}/record-payment")
async def record_offline_payment(
    tenant_id: str,
    data: RecordPaymentRequest,
    admin: dict = Depends(get_super_admin)
):
    """Record an offline payment for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    now = datetime.now(timezone.utc)
    
    # Create payment record
    payment = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "amount": data.amount,
        "payment_mode": data.payment_mode,
        "reference_number": data.reference_number,
        "plan": data.plan,
        "duration_months": data.duration_months,
        "notes": data.notes,
        "recorded_by": admin["id"],
        "recorded_by_name": admin["name"],
        "created_at": now.isoformat()
    }
    await db.payments.insert_one(payment)
    
    # If a plan is specified, automatically assign it
    if data.plan:
        plan_info = await db.subscription_plans.find_one({"id": data.plan, "is_active": True}, {"_id": 0})
        if plan_info and plan_info["price"] > 0:
            duration_days = plan_info["duration_days"] * data.duration_months
            
            # Get current subscription end or use now
            current_end = tenant.get("subscription_ends_at")
            if current_end:
                try:
                    end_date = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
                    if end_date < now:
                        end_date = now
                except:
                    end_date = now
            else:
                end_date = now
            
            subscription_ends_at = (end_date + timedelta(days=duration_days)).isoformat()
            
            await db.tenants.update_one(
                {"id": tenant_id},
                {"$set": {
                    "subscription_plan": data.plan,
                    "subscription_status": "paid",
                    "subscription_ends_at": subscription_ends_at,
                    "updated_at": now.isoformat()
                }}
            )
    
    # Log the action
    action_log = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "action": "payment_recorded",
        "payment_id": payment["id"],
        "amount": data.amount,
        "payment_mode": data.payment_mode,
        "plan": data.plan,
        "performed_by": admin["id"],
        "performed_by_name": admin["name"],
        "created_at": now.isoformat()
    }
    await db.admin_action_logs.insert_one(action_log)
    
    updated_tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    
    return {
        "message": "Payment recorded successfully",
        "payment": {k: v for k, v in payment.items() if k != "_id"},
        "tenant": {
            **updated_tenant,
            "subscription_plan": updated_tenant.get("subscription_plan", "free"),
            "subscription_status": updated_tenant.get("subscription_status", "trial")
        }
    }

@api_router.get("/super-admin/tenants/{tenant_id}/payments")
async def get_tenant_payments(
    tenant_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Get all payments for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    payments = await db.payments.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return payments

@api_router.get("/super-admin/tenants/{tenant_id}/action-logs")
async def get_tenant_action_logs(
    tenant_id: str,
    admin: dict = Depends(get_super_admin)
):
    """Get all admin action logs for a tenant"""
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    logs = await db.admin_action_logs.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return logs

@api_router.get("/super-admin/payments")
async def get_all_payments(
    admin: dict = Depends(get_super_admin),
    limit: int = 50
):
    """Get all recent payments across all tenants"""
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "tenants",
            "localField": "tenant_id",
            "foreignField": "id",
            "as": "tenant_info"
        }},
        {"$unwind": {"path": "$tenant_info", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "tenant_id": 1,
            "amount": 1,
            "payment_mode": 1,
            "reference_number": 1,
            "plan": 1,
            "duration_months": 1,
            "notes": 1,
            "recorded_by_name": 1,
            "created_at": 1,
            "tenant_name": "$tenant_info.company_name",
            "tenant_subdomain": "$tenant_info.subdomain"
        }}
    ]
    
    payments = await db.payments.aggregate(pipeline).to_list(limit)
    return payments

@api_router.post("/super-admin/setup")
async def setup_super_admin():
    """One-time setup to create the first super admin"""
    existing = await db.super_admins.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Super admin already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    admin_id = str(uuid.uuid4())
    
    super_admin = {
        "id": admin_id,
        "name": "Super Admin",
        "email": "superadmin@aftersales.pro",
        "password": hash_password("SuperAdmin@123"),
        "role": "super_admin",
        "created_at": now
    }
    
    await db.super_admins.insert_one(super_admin)
    
    return {
        "message": "Super admin created successfully",
        "email": "superadmin@aftersales.pro",
        "password": "SuperAdmin@123",
        "note": "Please change the password after first login"
    }

# ==================== CUSTOMER ROUTES ====================

@api_router.get("/customers")
async def get_customers(
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get unique customers with their device count, last visit, and outstanding balance"""
    tenant_id = user["tenant_id"]
    
    # Aggregate to get unique customers by mobile number with financial info
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$customer.mobile",
            "name": {"$first": "$customer.name"},
            "mobile": {"$first": "$customer.mobile"},
            "email": {"$first": "$customer.email"},
            "total_jobs": {"$sum": 1},
            "devices": {"$addToSet": {
                "device_type": "$device.device_type",
                "brand": "$device.brand",
                "model": "$device.model",
                "serial_imei": "$device.serial_imei"
            }},
            "last_visit": {"$first": "$created_at"},
            "first_visit": {"$last": "$created_at"},
            "total_billed": {"$sum": {"$ifNull": [
                "$delivery.final_amount", 
                {"$cond": {
                    "if": {"$and": [{"$ifNull": ["$repair.final_amount", False]}, {"$ifNull": ["$delivery", False]}]},
                    "then": "$repair.final_amount",
                    "else": 0
                }}
            ]}},
            "total_received": {"$sum": {"$ifNull": ["$delivery.amount_received", 0]}}
        }},
        {"$project": {
            "_id": 0,
            "name": 1,
            "mobile": 1,
            "email": 1,
            "total_jobs": 1,
            "device_count": {"$size": "$devices"},
            "last_visit": 1,
            "first_visit": 1,
            "total_billed": 1,
            "total_received": 1,
            "outstanding_balance": {"$max": [0, {"$subtract": ["$total_billed", "$total_received"]}]}
        }},
        {"$sort": {"last_visit": -1}}
    ]
    
    # Add search filter if provided
    if search:
        pipeline[0]["$match"]["$or"] = [
            {"customer.name": {"$regex": search, "$options": "i"}},
            {"customer.mobile": {"$regex": search, "$options": "i"}},
            {"customer.email": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.jobs.aggregate(pipeline).to_list(1000)
    
    # Also adjust for direct payments in customer_ledger
    for customer in customers:
        payments = await db.customer_ledger.find(
            {"tenant_id": tenant_id, "customer_mobile": customer["mobile"], "type": "payment"},
            {"_id": 0, "amount": 1}
        ).to_list(100)
        total_direct_payments = sum(p["amount"] for p in payments)
        customer["total_received"] += total_direct_payments
        customer["outstanding_balance"] = max(0, customer["total_billed"] - customer["total_received"])
    
    return {"customers": customers}

@api_router.get("/customers/{mobile}/devices")
async def get_customer_devices(
    mobile: str,
    user: dict = Depends(get_current_user)
):
    """Get all devices for a specific customer"""
    tenant_id = user["tenant_id"]
    
    # Aggregate to get unique devices for this customer
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "customer.mobile": mobile}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$device.serial_imei",
            "device_type": {"$first": "$device.device_type"},
            "brand": {"$first": "$device.brand"},
            "model": {"$first": "$device.model"},
            "serial_imei": {"$first": "$device.serial_imei"},
            "condition": {"$first": "$device.condition"},
            "total_repairs": {"$sum": 1},
            "last_repair": {"$first": "$created_at"},
            "first_repair": {"$last": "$created_at"},
            "latest_status": {"$first": "$status"},
            "latest_job_id": {"$first": "$id"},
            "latest_job_number": {"$first": "$job_number"}
        }},
        {"$project": {
            "_id": 0,
            "device_type": 1,
            "brand": 1,
            "model": 1,
            "serial_imei": 1,
            "condition": 1,
            "total_repairs": 1,
            "last_repair": 1,
            "first_repair": 1,
            "latest_status": 1,
            "latest_job_id": 1,
            "latest_job_number": 1
        }},
        {"$sort": {"last_repair": -1}}
    ]
    
    devices = await db.jobs.aggregate(pipeline).to_list(100)
    
    # Also get customer info
    customer_job = await db.jobs.find_one(
        {"tenant_id": tenant_id, "customer.mobile": mobile},
        {"_id": 0, "customer": 1}
    )
    customer = customer_job["customer"] if customer_job else {}
    
    return {
        "customer": customer,
        "devices": devices
    }

@api_router.get("/customers/{mobile}/devices/{serial_imei}/history")
async def get_device_history(
    mobile: str,
    serial_imei: str,
    user: dict = Depends(get_current_user)
):
    """Get job history for a specific device"""
    tenant_id = user["tenant_id"]
    
    # Get all jobs for this device
    jobs = await db.jobs.find(
        {
            "tenant_id": tenant_id,
            "customer.mobile": mobile,
            "device.serial_imei": serial_imei
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get device info from the first job
    device = jobs[0]["device"] if jobs else {}
    customer = jobs[0]["customer"] if jobs else {}
    
    # Simplify job data for history view
    history = []
    for job in jobs:
        history.append({
            "id": job["id"],
            "job_number": job["job_number"],
            "problem_description": job["problem_description"],
            "status": job["status"],
            "diagnosis": job.get("diagnosis"),
            "repair": job.get("repair"),
            "created_at": job["created_at"],
            "updated_at": job["updated_at"],
            "status_history": job.get("status_history", [])
        })
    
    return {
        "customer": customer,
        "device": device,
        "history": history,
        "total_repairs": len(history)
    }

@api_router.get("/customers/stats")
async def get_customer_stats(user: dict = Depends(get_current_user)):
    """Get customer statistics"""
    tenant_id = user["tenant_id"]
    
    # Total unique customers
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$customer.mobile"}},
        {"$count": "total"}
    ]
    total_result = await db.jobs.aggregate(pipeline).to_list(1)
    total_customers = total_result[0]["total"] if total_result else 0
    
    # Repeat customers (more than 1 job)
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$customer.mobile", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$count": "total"}
    ]
    repeat_result = await db.jobs.aggregate(pipeline).to_list(1)
    repeat_customers = repeat_result[0]["total"] if repeat_result else 0
    
    # New customers this month
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$customer.mobile", "first_visit": {"$min": "$created_at"}}},
        {"$match": {"first_visit": {"$gte": month_start.isoformat()}}},
        {"$count": "total"}
    ]
    new_result = await db.jobs.aggregate(pipeline).to_list(1)
    new_customers_this_month = new_result[0]["total"] if new_result else 0
    
    # Customers with outstanding credit
    credit_pipeline = [
        {"$match": {"tenant_id": tenant_id, "delivery": {"$exists": True}}},
        {"$group": {
            "_id": "$customer.mobile",
            "total_billed": {"$sum": {"$ifNull": [
                "$delivery.final_amount", 
                {"$ifNull": ["$repair.final_amount", 0]}
            ]}},
            "total_received": {"$sum": {"$ifNull": ["$delivery.amount_received", 0]}}
        }},
        {"$project": {
            "outstanding": {"$subtract": ["$total_billed", "$total_received"]}
        }},
        {"$match": {"outstanding": {"$gt": 0}}},
        {"$count": "total"}
    ]
    credit_result = await db.jobs.aggregate(credit_pipeline).to_list(1)
    customers_with_credit = credit_result[0]["total"] if credit_result else 0
    
    return {
        "total_customers": total_customers,
        "repeat_customers": repeat_customers,
        "new_customers_this_month": new_customers_this_month,
        "repeat_rate": round((repeat_customers / total_customers * 100), 1) if total_customers > 0 else 0,
        "customers_with_credit": customers_with_credit
    }

# ==================== CUSTOMER LEDGER ROUTES ====================

@api_router.get("/customers/{mobile}/ledger")
async def get_customer_ledger(mobile: str, user: dict = Depends(get_current_user)):
    """Get customer ledger showing all transactions and outstanding balance"""
    tenant_id = user["tenant_id"]
    
    # Get all jobs for this customer
    jobs = await db.jobs.find(
        {"tenant_id": tenant_id, "customer.mobile": mobile},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get all payments from ledger
    payments = await db.customer_ledger.find(
        {"tenant_id": tenant_id, "customer_mobile": mobile},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate totals
    total_billed = 0
    total_received = 0
    total_credit = 0
    
    transactions = []
    
    # Add job transactions
    for job in jobs:
        final_amount = 0
        amount_received = 0
        
        if job.get("delivery"):
            final_amount = job["delivery"].get("final_amount") or job["repair"].get("final_amount", 0) if job.get("repair") else 0
            amount_received = job["delivery"].get("amount_received", 0)
            is_credit = job["delivery"].get("is_credit", False)
            
            if final_amount > 0:
                total_billed += final_amount
                total_received += amount_received
                
                if is_credit or amount_received < final_amount:
                    credit_amt = final_amount - amount_received
                    total_credit += credit_amt
                
                transactions.append({
                    "id": job["id"],
                    "type": "job",
                    "date": job["delivery"].get("delivered_at") or job.get("updated_at"),
                    "job_number": job["job_number"],
                    "device": f"{job['device']['brand']} {job['device']['model']}",
                    "problem": job["problem_description"][:50] + "..." if len(job["problem_description"]) > 50 else job["problem_description"],
                    "billed_amount": final_amount,
                    "received_amount": amount_received,
                    "credit_amount": final_amount - amount_received if final_amount > amount_received else 0,
                    "status": "paid" if amount_received >= final_amount else "credit"
                })
        elif job.get("repair"):
            final_amount = job["repair"].get("final_amount", 0)
            if final_amount > 0 and job.get("status") in ["repaired", "ready_for_delivery"]:
                transactions.append({
                    "id": job["id"],
                    "type": "job_pending",
                    "date": job.get("updated_at"),
                    "job_number": job["job_number"],
                    "device": f"{job['device']['brand']} {job['device']['model']}",
                    "problem": job["problem_description"][:50] + "..." if len(job["problem_description"]) > 50 else job["problem_description"],
                    "billed_amount": final_amount,
                    "received_amount": 0,
                    "credit_amount": 0,
                    "status": "pending_delivery"
                })
    
    # Add direct payments
    for payment in payments:
        if payment.get("type") == "payment":
            total_received += payment["amount"]
            total_credit -= payment["amount"]
            transactions.append({
                "id": payment["id"],
                "type": "payment",
                "date": payment["created_at"],
                "job_number": payment.get("job_number"),
                "device": payment.get("device_info", "-"),
                "problem": payment.get("notes", "Direct payment received"),
                "billed_amount": 0,
                "received_amount": payment["amount"],
                "credit_amount": 0,
                "payment_mode": payment.get("payment_mode"),
                "status": "payment_received"
            })
    
    # Sort transactions by date
    transactions.sort(key=lambda x: x["date"] if x["date"] else "", reverse=True)
    
    return {
        "customer_mobile": mobile,
        "customer_name": jobs[0]["customer"]["name"] if jobs else "Unknown",
        "total_billed": total_billed,
        "total_received": total_received,
        "outstanding_balance": max(0, total_credit),
        "transactions": transactions
    }

@api_router.post("/customers/{mobile}/payment")
async def record_customer_payment(mobile: str, data: CustomerPayment, user: dict = Depends(get_current_user)):
    """Record a payment from customer (full or partial)"""
    tenant_id = user["tenant_id"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Get customer info from latest job
    latest_job = await db.jobs.find_one(
        {"tenant_id": tenant_id, "customer.mobile": mobile},
        {"_id": 0, "customer": 1, "device": 1, "job_number": 1}
    )
    
    if not latest_job:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    payment_id = str(uuid.uuid4())
    
    payment_record = {
        "id": payment_id,
        "tenant_id": tenant_id,
        "customer_mobile": mobile,
        "customer_name": latest_job["customer"]["name"],
        "amount": data.amount,
        "payment_mode": data.payment_mode,
        "payment_reference": data.payment_reference,
        "notes": data.notes,
        "job_id": data.job_id,
        "job_number": None,
        "device_info": None,
        "type": "payment",
        "recorded_by": user["id"],
        "created_at": now
    }
    
    # If linked to a job, get job details
    if data.job_id:
        job = await db.jobs.find_one({"id": data.job_id, "tenant_id": tenant_id}, {"_id": 0})
        if job:
            payment_record["job_number"] = job["job_number"]
            payment_record["device_info"] = f"{job['device']['brand']} {job['device']['model']}"
            
            # Update job's delivery record if exists
            if job.get("delivery"):
                new_received = job["delivery"].get("amount_received", 0) + data.amount
                await db.jobs.update_one(
                    {"id": data.job_id},
                    {"$set": {"delivery.amount_received": new_received, "updated_at": now}}
                )
    
    await db.customer_ledger.insert_one(payment_record)
    
    return {
        "message": "Payment recorded successfully",
        "payment_id": payment_id,
        "amount": data.amount
    }

@api_router.get("/customers/with-outstanding")
async def get_customers_with_outstanding(user: dict = Depends(get_current_user)):
    """Get all customers with outstanding balance"""
    tenant_id = user["tenant_id"]
    
    # Get all delivered jobs with credit
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "delivery": {"$exists": True}}},
        {"$group": {
            "_id": "$customer.mobile",
            "customer_name": {"$first": "$customer.name"},
            "total_billed": {"$sum": {"$ifNull": ["$delivery.final_amount", {"$ifNull": ["$repair.final_amount", 0]}]}},
            "total_received": {"$sum": {"$ifNull": ["$delivery.amount_received", 0]}},
            "job_count": {"$sum": 1},
            "last_job_date": {"$max": "$updated_at"}
        }},
        {"$project": {
            "mobile": "$_id",
            "customer_name": 1,
            "total_billed": 1,
            "total_received": 1,
            "outstanding": {"$subtract": ["$total_billed", "$total_received"]},
            "job_count": 1,
            "last_job_date": 1
        }},
        {"$match": {"outstanding": {"$gt": 0}}},
        {"$sort": {"outstanding": -1}}
    ]
    
    customers = await db.jobs.aggregate(pipeline).to_list(100)
    
    # Also get direct payments to adjust outstanding
    for customer in customers:
        payments = await db.customer_ledger.find(
            {"tenant_id": tenant_id, "customer_mobile": customer["mobile"], "type": "payment"},
            {"_id": 0, "amount": 1}
        ).to_list(100)
        
        total_direct_payments = sum(p["amount"] for p in payments)
        customer["total_received"] += total_direct_payments
        customer["outstanding"] = max(0, customer["total_billed"] - customer["total_received"])
    
    # Filter out customers with no outstanding
    customers = [c for c in customers if c["outstanding"] > 0]
    
    return customers

# ==================== INVENTORY ROUTES ====================

@api_router.post("/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(data: InventoryItemCreate, user: dict = Depends(require_admin)):
    # Check plan limit
    limit_check = await check_inventory_limit(user["tenant_id"])
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["message"])
    
    # Check feature access
    feature_check = await check_feature_access(user["tenant_id"], "inventory_management")
    if not feature_check["allowed"]:
        raise HTTPException(status_code=403, detail=feature_check["message"])
    
    now = datetime.now(timezone.utc).isoformat()
    item_id = str(uuid.uuid4())
    
    # Generate SKU if not provided
    sku = data.sku
    if not sku:
        count = await db.inventory.count_documents({"tenant_id": user["tenant_id"]})
        sku = f"PART-{str(count + 1).zfill(4)}"
    
    item = {
        "id": item_id,
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "sku": sku,
        "category": data.category,
        "quantity": data.quantity,
        "min_stock_level": data.min_stock_level,
        "cost_price": data.cost_price,
        "selling_price": data.selling_price,
        "supplier": data.supplier,
        "description": data.description,
        "stock_history": [{
            "change": data.quantity,
            "reason": "Initial stock",
            "timestamp": now,
            "user_id": user["id"]
        }],
        "created_at": now,
        "updated_at": now
    }
    await db.inventory.insert_one(item)
    
    item["is_low_stock"] = item["quantity"] <= item["min_stock_level"]
    return InventoryItemResponse(**item)

@api_router.get("/inventory", response_model=List[InventoryItemResponse])
async def list_inventory(
    category: Optional[str] = None,
    low_stock_only: bool = False,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"tenant_id": user["tenant_id"]}
    
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.inventory.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    
    result = []
    for item in items:
        item["is_low_stock"] = item["quantity"] <= item["min_stock_level"]
        if low_stock_only and not item["is_low_stock"]:
            continue
        result.append(InventoryItemResponse(**item))
    
    return result

@api_router.get("/inventory/categories")
async def get_inventory_categories(user: dict = Depends(get_current_user)):
    """Get distinct categories for the tenant"""
    categories = await db.inventory.distinct("category", {"tenant_id": user["tenant_id"]})
    return [c for c in categories if c]

@api_router.get("/inventory/stats")
async def get_inventory_stats(user: dict = Depends(get_current_user)):
    """Get inventory statistics"""
    tenant_id = user["tenant_id"]
    
    total_items = await db.inventory.count_documents({"tenant_id": tenant_id})
    
    # Low stock items
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$match": {"$expr": {"$lte": ["$quantity", "$min_stock_level"]}}},
        {"$count": "count"}
    ]
    low_stock_result = await db.inventory.aggregate(pipeline).to_list(1)
    low_stock_count = low_stock_result[0]["count"] if low_stock_result else 0
    
    # Out of stock
    out_of_stock = await db.inventory.count_documents({"tenant_id": tenant_id, "quantity": 0})
    
    # Total value
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": None,
            "total_cost_value": {"$sum": {"$multiply": ["$quantity", "$cost_price"]}},
            "total_selling_value": {"$sum": {"$multiply": ["$quantity", "$selling_price"]}}
        }}
    ]
    value_result = await db.inventory.aggregate(pipeline).to_list(1)
    values = value_result[0] if value_result else {"total_cost_value": 0, "total_selling_value": 0}
    
    return {
        "total_items": total_items,
        "low_stock_count": low_stock_count,
        "out_of_stock": out_of_stock,
        "total_cost_value": values.get("total_cost_value", 0),
        "total_selling_value": values.get("total_selling_value", 0)
    }

@api_router.get("/inventory/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item["is_low_stock"] = item["quantity"] <= item["min_stock_level"]
    return InventoryItemResponse(**item)

@api_router.put("/inventory/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(item_id: str, data: InventoryItemUpdate, user: dict = Depends(require_admin)):
    item = await db.inventory.find_one({"id": item_id, "tenant_id": user["tenant_id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = now
    
    await db.inventory.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    updated_item["is_low_stock"] = updated_item["quantity"] <= updated_item["min_stock_level"]
    return InventoryItemResponse(**updated_item)

@api_router.post("/inventory/{item_id}/adjust")
async def adjust_stock(item_id: str, data: StockAdjustment, user: dict = Depends(get_current_user)):
    """Adjust stock quantity (add or remove)"""
    item = await db.inventory.find_one({"id": item_id, "tenant_id": user["tenant_id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    new_quantity = item["quantity"] + data.quantity_change
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Cannot reduce stock below 0")
    
    now = datetime.now(timezone.utc).isoformat()
    
    stock_entry = {
        "change": data.quantity_change,
        "reason": data.reason,
        "job_id": data.job_id,
        "timestamp": now,
        "user_id": user["id"]
    }
    
    await db.inventory.update_one(
        {"id": item_id},
        {
            "$set": {"quantity": new_quantity, "updated_at": now},
            "$push": {"stock_history": stock_entry}
        }
    )
    
    updated_item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    updated_item["is_low_stock"] = updated_item["quantity"] <= updated_item["min_stock_level"]
    return InventoryItemResponse(**updated_item)

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, user: dict = Depends(require_admin)):
    result = await db.inventory.delete_one({"id": item_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

@api_router.get("/inventory/{item_id}/usage-history")
async def get_inventory_usage_history(item_id: str, user: dict = Depends(get_current_user)):
    """Get usage history for an inventory item - which jobs used this part"""
    tenant_id = user["tenant_id"]
    
    # Verify item exists
    item = await db.inventory.find_one({"id": item_id, "tenant_id": tenant_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get usage records
    usage_records = await db.inventory_usage.find(
        {"inventory_id": item_id, "tenant_id": tenant_id},
        {"_id": 0}
    ).sort("used_at", -1).to_list(100)
    
    return {
        "item": {
            "id": item["id"],
            "name": item["name"],
            "sku": item.get("sku"),
            "current_quantity": item["quantity"]
        },
        "usage_history": usage_records,
        "total_used": sum(r["quantity_used"] for r in usage_records)
    }

# ==================== TECHNICIAN METRICS ROUTES ====================

@api_router.get("/metrics/technicians")
async def get_technician_metrics(user: dict = Depends(get_current_user)):
    """Get performance metrics for all technicians"""
    tenant_id = user["tenant_id"]
    
    # Get all users (technicians and admins)
    users = await db.users.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "id": 1, "name": 1, "role": 1}
    ).to_list(100)
    
    user_map = {u["id"]: u for u in users}
    
    # Jobs created by each user
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": "$created_by",
            "total_jobs": {"$sum": 1}
        }}
    ]
    jobs_created = await db.jobs.aggregate(pipeline).to_list(100)
    jobs_created_map = {item["_id"]: item["total_jobs"] for item in jobs_created}
    
    # Closed jobs by user (from status_history where status=closed)
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": "closed"}},
        {"$project": {
            "closed_entry": {
                "$filter": {
                    "input": "$status_history",
                    "cond": {"$eq": ["$$this.status", "closed"]}
                }
            },
            "created_at": 1
        }},
        {"$unwind": "$closed_entry"},
        {"$group": {
            "_id": "$closed_entry.user_id",
            "jobs_closed": {"$sum": 1}
        }}
    ]
    jobs_closed = await db.jobs.aggregate(pipeline).to_list(100)
    jobs_closed_map = {item["_id"]: item["jobs_closed"] for item in jobs_closed}
    
    # Jobs by status for each creator
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": {"user": "$created_by", "status": "$status"},
            "count": {"$sum": 1}
        }}
    ]
    jobs_by_status = await db.jobs.aggregate(pipeline).to_list(500)
    
    status_by_user = {}
    for item in jobs_by_status:
        user_id = item["_id"]["user"]
        job_status = item["_id"]["status"]
        if user_id not in status_by_user:
            status_by_user[user_id] = {}
        status_by_user[user_id][job_status] = item["count"]
    
    # Average repair time (received to closed)
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": "closed"}},
        {"$project": {
            "created_by": 1,
            "received_time": {
                "$arrayElemAt": [
                    {"$filter": {
                        "input": "$status_history",
                        "cond": {"$eq": ["$$this.status", "received"]}
                    }},
                    0
                ]
            },
            "closed_time": {
                "$arrayElemAt": [
                    {"$filter": {
                        "input": "$status_history",
                        "cond": {"$eq": ["$$this.status", "closed"]}
                    }},
                    0
                ]
            }
        }},
        {"$match": {"received_time": {"$ne": None}, "closed_time": {"$ne": None}}}
    ]
    time_data = await db.jobs.aggregate(pipeline).to_list(1000)
    
    # Calculate average time per user
    avg_time_by_user = {}
    for job in time_data:
        try:
            received = datetime.fromisoformat(job["received_time"]["timestamp"].replace("Z", "+00:00"))
            closed = datetime.fromisoformat(job["closed_time"]["timestamp"].replace("Z", "+00:00"))
            duration_hours = (closed - received).total_seconds() / 3600
            
            user_id = job["created_by"]
            if user_id not in avg_time_by_user:
                avg_time_by_user[user_id] = []
            avg_time_by_user[user_id].append(duration_hours)
        except (KeyError, ValueError, TypeError):
            continue
    
    # Build response
    technicians = []
    for user_id, user_info in user_map.items():
        times = avg_time_by_user.get(user_id, [])
        avg_hours = sum(times) / len(times) if times else 0
        
        technicians.append({
            "id": user_id,
            "name": user_info["name"],
            "role": user_info["role"],
            "jobs_created": jobs_created_map.get(user_id, 0),
            "jobs_closed": jobs_closed_map.get(user_id, 0),
            "jobs_by_status": status_by_user.get(user_id, {}),
            "avg_repair_time_hours": round(avg_hours, 1),
            "avg_repair_time_display": f"{int(avg_hours // 24)}d {int(avg_hours % 24)}h" if avg_hours > 0 else "N/A"
        })
    
    # Sort by jobs closed
    technicians.sort(key=lambda x: x["jobs_closed"], reverse=True)
    
    return {"technicians": technicians}

@api_router.get("/metrics/overview")
async def get_metrics_overview(user: dict = Depends(get_current_user)):
    """Get overall shop performance metrics"""
    tenant_id = user["tenant_id"]
    
    # Date ranges
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Jobs this week
    jobs_this_week = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # Jobs this month
    jobs_this_month = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    # Completed this week
    completed_this_week = await db.jobs.count_documents({
        "tenant_id": tenant_id,
        "status": "closed",
        "updated_at": {"$gte": week_start.isoformat()}
    })
    
    # Average jobs per day this month
    days_in_month = (now - month_start).days + 1
    avg_jobs_per_day = jobs_this_month / days_in_month if days_in_month > 0 else 0
    
    # Revenue this month (from closed jobs)
    pipeline = [
        {"$match": {
            "tenant_id": tenant_id,
            "status": "closed",
            "updated_at": {"$gte": month_start.isoformat()}
        }},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$repair.final_amount"}
        }}
    ]
    revenue_result = await db.jobs.aggregate(pipeline).to_list(1)
    monthly_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
    
    # Jobs by status
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(10)
    jobs_by_status = {item["_id"]: item["count"] for item in status_counts}
    
    # Jobs trend (last 7 days)
    trend = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        count = await db.jobs.count_documents({
            "tenant_id": tenant_id,
            "created_at": {
                "$gte": day.isoformat(),
                "$lt": day_end.isoformat()
            }
        })
        trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "day": day.strftime("%a"),
            "jobs": count
        })
    
    return {
        "jobs_this_week": jobs_this_week,
        "jobs_this_month": jobs_this_month,
        "completed_this_week": completed_this_week,
        "avg_jobs_per_day": round(avg_jobs_per_day, 1),
        "monthly_revenue": monthly_revenue,
        "jobs_by_status": jobs_by_status,
        "trend": trend
    }

# ==================== PROFIT TRACKING ROUTES ====================

@api_router.post("/settings/profit-password")
async def set_profit_password(data: ProfitPasswordSet, user: dict = Depends(get_current_user)):
    """Set or update the profit section password (Admin only)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can set profit password")
    
    tenant_id = user["tenant_id"]
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"profit_password": hashed}}
    )
    
    return {"message": "Profit password set successfully"}

@api_router.post("/settings/verify-profit-password")
async def verify_profit_password(data: ProfitPasswordVerify, user: dict = Depends(get_current_user)):
    """Verify profit section password (Admin only)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access profit section")
    
    tenant_id = user["tenant_id"]
    tenant = await db.tenants.find_one({"id": tenant_id})
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    profit_password = tenant.get("profit_password")
    if not profit_password:
        raise HTTPException(status_code=400, detail="Profit password not set. Please set a password first.")
    
    if not bcrypt.checkpw(data.password.encode(), profit_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    return {"verified": True, "message": "Password verified successfully"}

@api_router.get("/settings/profit-password-status")
async def get_profit_password_status(user: dict = Depends(get_current_user)):
    """Check if profit password is set"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this")
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]})
    has_password = bool(tenant.get("profit_password")) if tenant else False
    
    return {"has_password": has_password}

@api_router.get("/profit/pending-expenses")
async def get_pending_expenses(user: dict = Depends(get_current_user)):
    """Get delivered/closed jobs without expense entries"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access profit data")
    
    tenant_id = user["tenant_id"]
    
    # Find jobs that are delivered or closed but don't have expense data
    pipeline = [
        {
            "$match": {
                "tenant_id": tenant_id,
                "status": {"$in": ["delivered", "closed"]},
                "$or": [
                    {"delivery.expense_parts": None},
                    {"delivery.expense_labor": None},
                    {"delivery.expense_parts": {"$exists": False}},
                    {"delivery.expense_labor": {"$exists": False}}
                ]
            }
        },
        {"$sort": {"delivery.delivered_at": -1}},
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "job_number": 1,
                "customer": 1,
                "device": 1,
                "status": 1,
                "delivery": 1,
                "repair": 1,
                "created_at": 1
            }
        }
    ]
    
    jobs = await db.jobs.aggregate(pipeline).to_list(500)
    return {"jobs": jobs, "count": len(jobs)}

@api_router.put("/profit/bulk-expense")
async def update_bulk_expenses(data: BulkExpenseRequest, user: dict = Depends(get_current_user)):
    """Update expenses for multiple jobs at once"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update expenses")
    
    tenant_id = user["tenant_id"]
    now = datetime.now(timezone.utc).isoformat()
    updated_count = 0
    errors = []
    
    for expense in data.expenses:
        job = await db.jobs.find_one({"id": expense.job_id, "tenant_id": tenant_id})
        if not job:
            errors.append(f"Job {expense.job_id} not found")
            continue
        
        if job["status"] not in ["delivered", "closed"]:
            errors.append(f"Job {job['job_number']} is not delivered yet")
            continue
        
        result = await db.jobs.update_one(
            {"id": expense.job_id, "tenant_id": tenant_id},
            {
                "$set": {
                    "delivery.expense_parts": expense.expense_parts,
                    "delivery.expense_labor": expense.expense_labor,
                    "delivery.expense_updated_at": now,
                    "delivery.expense_updated_by": user["id"]
                }
            }
        )
        if result.modified_count > 0:
            updated_count += 1
    
    return {
        "updated": updated_count,
        "errors": errors,
        "message": f"Updated expenses for {updated_count} jobs"
    }

@api_router.get("/profit/job-wise")
async def get_job_wise_profit(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get job-wise profit report"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access profit data")
    
    tenant_id = user["tenant_id"]
    
    match_query = {
        "tenant_id": tenant_id,
        "status": {"$in": ["delivered", "closed"]},
        "delivery": {"$exists": True}
    }
    
    if date_from:
        match_query["delivery.delivered_at"] = {"$gte": date_from}
    if date_to:
        if "delivery.delivered_at" in match_query:
            match_query["delivery.delivered_at"]["$lte"] = date_to
        else:
            match_query["delivery.delivered_at"] = {"$lte": date_to}
    
    pipeline = [
        {"$match": match_query},
        {"$sort": {"delivery.delivered_at": -1}},
        {
            "$project": {
                "_id": 0,
                "id": 1,
                "job_number": 1,
                "customer_name": "$customer.name",
                "customer_mobile": "$customer.mobile",
                "device": {"$concat": ["$device.brand", " ", "$device.model"]},
                "device_type": "$device.device_type",
                "problem": "$problem_description",
                "amount_received": {"$ifNull": ["$delivery.amount_received", 0]},
                "expense_parts": {"$ifNull": ["$delivery.expense_parts", 0]},
                "expense_labor": {"$ifNull": ["$delivery.expense_labor", 0]},
                "total_expense": {
                    "$add": [
                        {"$ifNull": ["$delivery.expense_parts", 0]},
                        {"$ifNull": ["$delivery.expense_labor", 0]}
                    ]
                },
                "profit": {
                    "$subtract": [
                        {"$ifNull": ["$delivery.amount_received", 0]},
                        {
                            "$add": [
                                {"$ifNull": ["$delivery.expense_parts", 0]},
                                {"$ifNull": ["$delivery.expense_labor", 0]}
                            ]
                        }
                    ]
                },
                "has_expense": {
                    "$and": [
                        {"$gt": [{"$ifNull": ["$delivery.expense_parts", 0]}, 0]},
                        {"$gte": [{"$ifNull": ["$delivery.expense_labor", 0]}, 0]}
                    ]
                },
                "delivered_at": "$delivery.delivered_at",
                "status": 1
            }
        }
    ]
    
    jobs = await db.jobs.aggregate(pipeline).to_list(1000)
    
    # Calculate totals
    total_received = sum(j["amount_received"] for j in jobs)
    total_expense = sum(j["total_expense"] for j in jobs)
    total_profit = sum(j["profit"] for j in jobs)
    jobs_with_expense = sum(1 for j in jobs if j["has_expense"])
    
    return {
        "jobs": jobs,
        "summary": {
            "total_jobs": len(jobs),
            "jobs_with_expense": jobs_with_expense,
            "jobs_pending_expense": len(jobs) - jobs_with_expense,
            "total_received": total_received,
            "total_expense": total_expense,
            "total_profit": total_profit,
            "profit_margin": round((total_profit / total_received * 100), 2) if total_received > 0 else 0
        }
    }

@api_router.get("/profit/party-wise")
async def get_party_wise_profit(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get customer/party-wise profit report"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access profit data")
    
    tenant_id = user["tenant_id"]
    
    match_query = {
        "tenant_id": tenant_id,
        "status": {"$in": ["delivered", "closed"]},
        "delivery": {"$exists": True}
    }
    
    if date_from:
        match_query["delivery.delivered_at"] = {"$gte": date_from}
    if date_to:
        if "delivery.delivered_at" in match_query:
            match_query["delivery.delivered_at"]["$lte"] = date_to
        else:
            match_query["delivery.delivered_at"] = {"$lte": date_to}
    
    pipeline = [
        {"$match": match_query},
        {
            "$group": {
                "_id": "$customer.mobile",
                "customer_name": {"$first": "$customer.name"},
                "customer_mobile": {"$first": "$customer.mobile"},
                "total_jobs": {"$sum": 1},
                "total_received": {"$sum": {"$ifNull": ["$delivery.amount_received", 0]}},
                "total_expense_parts": {"$sum": {"$ifNull": ["$delivery.expense_parts", 0]}},
                "total_expense_labor": {"$sum": {"$ifNull": ["$delivery.expense_labor", 0]}},
                "last_visit": {"$max": "$delivery.delivered_at"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "customer_name": 1,
                "customer_mobile": 1,
                "total_jobs": 1,
                "total_received": 1,
                "total_expense_parts": 1,
                "total_expense_labor": 1,
                "total_expense": {"$add": ["$total_expense_parts", "$total_expense_labor"]},
                "profit": {
                    "$subtract": [
                        "$total_received",
                        {"$add": ["$total_expense_parts", "$total_expense_labor"]}
                    ]
                },
                "last_visit": 1
            }
        },
        {"$sort": {"profit": -1}}
    ]
    
    parties = await db.jobs.aggregate(pipeline).to_list(500)
    
    # Calculate totals
    total_received = sum(p["total_received"] for p in parties)
    total_expense = sum(p["total_expense"] for p in parties)
    total_profit = sum(p["profit"] for p in parties)
    
    return {
        "parties": parties,
        "summary": {
            "total_customers": len(parties),
            "total_received": total_received,
            "total_expense": total_expense,
            "total_profit": total_profit,
            "profit_margin": round((total_profit / total_received * 100), 2) if total_received > 0 else 0
        }
    }

@api_router.get("/profit/summary")
async def get_profit_summary(
    period: str = "month",  # day, week, month, year
    user: dict = Depends(get_current_user)
):
    """Get profit summary for dashboard"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access profit data")
    
    tenant_id = user["tenant_id"]
    now = datetime.now(timezone.utc)
    
    # Calculate date range based on period
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {
            "$match": {
                "tenant_id": tenant_id,
                "status": {"$in": ["delivered", "closed"]},
                "delivery.delivered_at": {"$gte": start_date.isoformat()}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_jobs": {"$sum": 1},
                "total_received": {"$sum": {"$ifNull": ["$delivery.amount_received", 0]}},
                "total_expense_parts": {"$sum": {"$ifNull": ["$delivery.expense_parts", 0]}},
                "total_expense_labor": {"$sum": {"$ifNull": ["$delivery.expense_labor", 0]}},
                "jobs_with_expense": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$gt": [{"$ifNull": ["$delivery.expense_parts", 0]}, 0]},
                                {"$gte": [{"$ifNull": ["$delivery.expense_labor", 0]}, 0]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]
    
    result = await db.jobs.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "total_jobs": 0,
            "jobs_with_expense": 0,
            "jobs_pending_expense": 0,
            "total_received": 0,
            "total_expense_parts": 0,
            "total_expense_labor": 0,
            "total_expense": 0,
            "total_profit": 0,
            "profit_margin": 0
        }
    
    data = result[0]
    total_expense = data["total_expense_parts"] + data["total_expense_labor"]
    total_profit = data["total_received"] - total_expense
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "total_jobs": data["total_jobs"],
        "jobs_with_expense": data["jobs_with_expense"],
        "jobs_pending_expense": data["total_jobs"] - data["jobs_with_expense"],
        "total_received": data["total_received"],
        "total_expense_parts": data["total_expense_parts"],
        "total_expense_labor": data["total_expense_labor"],
        "total_expense": total_expense,
        "total_profit": total_profit,
        "profit_margin": round((total_profit / data["total_received"] * 100), 2) if data["total_received"] > 0 else 0
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
