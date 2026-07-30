#!/bin/bash
# =====================================================
# AfterSales.pro - Production Deployment Script
# Run this script on your Vultr server
# =====================================================

echo "============================================="
echo "AfterSales.pro Production Deployment"
echo "============================================="
echo ""

# Step 1: Navigate to project directory
echo "STEP 1: Navigating to project directory..."
cd /var/www/aftersales || { echo "ERROR: Directory not found"; exit 1; }
echo "✅ In project directory"
echo ""

# Step 2: Pull latest changes
echo "STEP 2: Pulling latest changes from Git..."
git stash
git pull origin main
echo "✅ Code updated"
echo ""

# Step 3: Install backend dependencies
echo "STEP 3: Installing backend dependencies..."
cd /var/www/aftersales/backend
pip install resend
pip freeze > requirements.txt
echo "✅ Backend dependencies installed"
echo ""

# Step 4: Update backend .env (add Resend config if not present)
echo "STEP 4: Checking backend .env for Resend config..."
if ! grep -q "RESEND_API_KEY" /var/www/aftersales/backend/.env; then
    echo 'RESEND_API_KEY="re_FuKNR2b1_BUCJ6kfmt4euBEcHVvbgyBFd"' >> /var/www/aftersales/backend/.env
    echo 'SENDER_EMAIL="AfterSales.pro <onboarding@resend.dev>"' >> /var/www/aftersales/backend/.env
    echo 'ADMIN_EMAIL="admin@aftersales.pro"' >> /var/www/aftersales/backend/.env
    echo "✅ Resend config added to .env"
else
    echo "✅ Resend config already present"
fi
echo ""

# Step 5: Build frontend
echo "STEP 5: Building frontend (this takes 2-3 minutes)..."
echo "⚠️  DO NOT INTERRUPT THIS STEP"
cd /var/www/aftersales/frontend
yarn install
yarn build
echo "✅ Frontend built successfully"
echo ""

# Step 6: Copy build to Nginx
echo "STEP 6: Copying build to Nginx public folder..."
sudo rm -rf /var/www/html/aftersales/*
sudo cp -r build/* /var/www/html/aftersales/
echo "✅ Build copied to Nginx"
echo ""

# Step 7: Update MongoDB plans
echo "STEP 7: Updating subscription plans in MongoDB..."
mongosh --eval '
db = db.getSiblingDB("aftersales_pro");

// Delete old plans
db.subscription_plans.deleteMany({});

// Insert new Free & Pro plans
db.subscription_plans.insertMany([
  {
    "id": "plan_free",
    "name": "Free",
    "description": "Get started with essential features",
    "price_monthly": 0,
    "price_yearly": 0,
    "is_active": true,
    "is_default": true,
    "limits": {
      "max_users": 2,
      "max_branches": 1,
      "max_jobs_per_month": 30,
      "max_inventory_items": 50,
      "max_photos_per_job": 3,
      "max_storage_mb": 100
    },
    "features": {
      "job_management": true,
      "basic_reports": true,
      "pdf_job_sheet": true,
      "qr_tracking": true,
      "whatsapp_messages": true,
      "photo_upload": true,
      "inventory_management": false,
      "advanced_analytics": false,
      "technician_metrics": false,
      "customer_management": true,
      "email_notifications": false,
      "sms_notifications": false,
      "custom_branding": false,
      "api_access": false,
      "priority_support": false,
      "dedicated_account_manager": false,
      "data_export": false,
      "multi_branch": false
    },
    "created_at": new Date().toISOString()
  },
  {
    "id": "plan_pro",
    "name": "Pro",
    "description": "Full power for growing repair shops",
    "price_monthly": 99,
    "price_yearly": 999,
    "is_active": true,
    "is_default": false,
    "limits": {
      "max_users": 999,
      "max_branches": 99,
      "max_jobs_per_month": 999999,
      "max_inventory_items": 999999,
      "max_photos_per_job": 20,
      "max_storage_mb": 10000
    },
    "features": {
      "job_management": true,
      "basic_reports": true,
      "pdf_job_sheet": true,
      "qr_tracking": true,
      "whatsapp_messages": true,
      "photo_upload": true,
      "inventory_management": true,
      "advanced_analytics": true,
      "technician_metrics": true,
      "customer_management": true,
      "email_notifications": true,
      "sms_notifications": true,
      "custom_branding": true,
      "api_access": true,
      "priority_support": true,
      "dedicated_account_manager": false,
      "data_export": true,
      "multi_branch": true
    },
    "created_at": new Date().toISOString()
  }
]);

print("✅ Plans updated: " + db.subscription_plans.countDocuments() + " plans");
'
echo ""

# Step 8: Restart backend service
echo "STEP 8: Restarting backend service..."
sudo systemctl restart aftersales-backend
sleep 3
sudo systemctl status aftersales-backend --no-pager
echo ""

# Step 9: Verify deployment
echo "STEP 9: Verifying deployment..."
echo ""
echo "Testing API health..."
curl -s https://aftersales.pro/api/super-admin/plans | head -100 || echo "API check failed"
echo ""

echo "============================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================="
echo ""
echo "Please verify:"
echo "1. Visit https://aftersales.pro"
echo "2. Check pricing shows 'Free' and 'Pro' plans"
echo "3. Test login with existing accounts"
echo ""
