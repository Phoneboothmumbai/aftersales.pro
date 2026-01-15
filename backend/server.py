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
    serial_imei: str
    condition: str  # Fresh, Active, Physical Damage, Dead, Liquid
    condition_notes: Optional[str] = None

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

class RepairUpdate(BaseModel):
    work_done: str
    parts_replaced: Optional[str] = None
    final_amount: float
    warranty_info: Optional[str] = None

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
    repair: Optional[dict] = None
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

# ==================== USER ROUTES ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, admin: dict = Depends(require_admin)):
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
        "repair": None,
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

@api_router.put("/jobs/{job_id}/repair")
async def update_repair(job_id: str, data: RepairUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot update closed job")
    
    repair = {
        "work_done": data.work_done,
        "parts_replaced": data.parts_replaced,
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

@api_router.put("/jobs/{job_id}/close")
async def close_job(job_id: str, data: CloseJobRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    job = await db.jobs.find_one({"id": job_id, "tenant_id": user["tenant_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] == "closed":
        raise HTTPException(status_code=400, detail="Job already closed")
    
    closure = {
        "device_delivered": data.device_delivered,
        "accessories_returned": data.accessories_returned,
        "payment_mode": data.payment_mode,
        "invoice_reference": data.invoice_reference,
        "closed_at": now,
        "closed_by": user["id"]
    }
    
    status_entry = {
        "status": "closed",
        "timestamp": now,
        "user_id": user["id"],
        "user_name": user["name"],
        "notes": f"Job closed. Payment: {data.payment_mode}"
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
    
    valid_statuses = ["received", "diagnosed", "waiting_for_approval", "repaired", "closed"]
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
    
    checked_accessories = [a["name"] for a in job["accessories"] if a["checked"]]
    accessories_text = ", ".join(checked_accessories) if checked_accessories else "None"
    
    if message_type == "received":
        message = f"""Hello {customer['name']},

Your device has been received.

Job Sheet No: {job['job_number']}
Device: {device['brand']} {device['model']}
Issue: {job['problem_description']}
Accessories: {accessories_text}

We will update you shortly.
– {company}"""
    
    elif message_type == "diagnosis":
        if not job.get("diagnosis"):
            raise HTTPException(status_code=400, detail="No diagnosis available")
        diag = job["diagnosis"]
        message = f"""Diagnosis complete for Job: {job['job_number']}

Issue: {diag['diagnosis']}
Estimated Cost: ₹{diag['estimated_cost']}
Timeline: {diag['estimated_timeline']}

Please reply YES to approve.
– {company}"""
    
    elif message_type == "repaired":
        if not job.get("repair"):
            raise HTTPException(status_code=400, detail="No repair details available")
        repair = job["repair"]
        message = f"""Good news!
Your device (Job: {job['job_number']}) has been repaired.

Final Amount: ₹{repair['final_amount']}
Please visit to collect your device.

Thank you.
– {company}"""
    
    else:
        message = f"""Update for Job: {job['job_number']}

Status: {job['status'].replace('_', ' ').title()}

– {company}"""
    
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
    created_at: str
    admin_email: Optional[str] = None
    total_jobs: int = 0
    total_users: int = 0

class TenantUpdateByAdmin(BaseModel):
    is_active: Optional[bool] = None
    subscription_status: Optional[str] = None
    trial_ends_at: Optional[str] = None

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
    
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(10)
    jobs_by_status = {item["_id"]: item["count"] for item in status_counts}
    
    # Recent jobs
    recent_jobs = await db.jobs.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "job_number": 1, "customer": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "tenant": {
            **tenant,
            "is_active": tenant.get("is_active", True),
            "subscription_status": tenant.get("subscription_status", "trial")
        },
        "users": users,
        "branches": branches,
        "stats": {
            "total_jobs": total_jobs,
            "jobs_by_status": jobs_by_status
        },
        "recent_jobs": recent_jobs
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
        "subscription_status": updated_tenant.get("subscription_status", "trial")
    }

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

# ==================== INVENTORY ROUTES ====================

@api_router.post("/inventory", response_model=InventoryItemResponse)
async def create_inventory_item(data: InventoryItemCreate, user: dict = Depends(require_admin)):
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
        status = item["_id"]["status"]
        if user_id not in status_by_user:
            status_by_user[user_id] = {}
        status_by_user[user_id][status] = item["count"]
    
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
        except:
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
