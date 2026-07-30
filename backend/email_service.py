"""
Email Service for AfterSales.pro
Using Resend API for transactional emails
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import resend
from dotenv import load_dotenv

load_dotenv()

# Configure Resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "AfterSales.pro <onboarding@resend.dev>")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@aftersales.pro")

logger = logging.getLogger(__name__)

# ==================== EMAIL TEMPLATES ====================

def get_base_template(content: str, preview_text: str = "") -> str:
    """Base HTML email template with consistent styling"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AfterSales.pro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <div style="display: none; max-height: 0; overflow: hidden;">{preview_text}</div>
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 40px 20px;">
                    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">AfterSales.pro</h1>
                                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Repair Shop Management Made Simple</p>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                {content}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 10px; color: #64748b; font-size: 13px;">
                                    Need help? Reply to this email or contact us at support@aftersales.pro
                                </p>
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                    © {datetime.now().year} AfterSales.pro. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# ==================== LIFECYCLE EMAILS ====================

def welcome_email_template(shop_name: str, owner_name: str, subdomain: str) -> Dict[str, str]:
    """Welcome email for new signups"""
    content = f"""
    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px;">Welcome to AfterSales.pro! 🎉</h2>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{owner_name}</strong>,
    </p>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Thank you for choosing AfterSales.pro to manage <strong>{shop_name}</strong>. We're thrilled to have you on board!
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        Your shop is now live at:
    </p>
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
        <a href="https://aftersales.pro/login" style="color: #3b82f6; font-size: 18px; font-weight: 600; text-decoration: none;">
            aftersales.pro/login
        </a>
        <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Subdomain: <strong>{subdomain}</strong></p>
    </div>
    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 18px;">Getting Started:</h3>
    <ol style="margin: 0 0 25px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
        <li>Create your first repair job</li>
        <li>Add your team members</li>
        <li>Set up your shop settings & branding</li>
        <li>Enable WhatsApp notifications</li>
    </ol>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://aftersales.pro/login" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Go to Dashboard
        </a>
    </div>
    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
        If you have any questions, just reply to this email. We're here to help!
    </p>
    """
    return {
        "subject": f"Welcome to AfterSales.pro, {owner_name}! 🎉",
        "html": get_base_template(content, f"Welcome {owner_name}! Your shop {shop_name} is ready.")
    }

def password_reset_email_template(name: str, reset_link: str) -> Dict[str, str]:
    """Password reset email"""
    content = f"""
    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px;">Reset Your Password</h2>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password:
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
        </a>
    </div>
    <p style="margin: 0 0 15px; color: #64748b; font-size: 14px; line-height: 1.6;">
        This link will expire in 1 hour for security reasons.
    </p>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        If you didn't request this, please ignore this email. Your password will remain unchanged.
    </p>
    """
    return {
        "subject": "Reset Your Password - AfterSales.pro",
        "html": get_base_template(content, "Reset your AfterSales.pro password")
    }

def email_verified_template(name: str) -> Dict[str, str]:
    """Email verification confirmation"""
    content = f"""
    <div style="text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
        <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px;">Email Verified!</h2>
        <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
            Hi <strong>{name}</strong>, your email has been successfully verified.
        </p>
        <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
            You now have full access to all AfterSales.pro features.
        </p>
        <a href="https://aftersales.pro/login" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Go to Dashboard
        </a>
    </div>
    """
    return {
        "subject": "Email Verified ✅ - AfterSales.pro",
        "html": get_base_template(content, "Your email has been verified!")
    }

# ==================== SUBSCRIPTION EMAILS ====================

def payment_success_email_template(name: str, plan_name: str, amount: float, invoice_id: str) -> Dict[str, str]:
    """Payment success/receipt email"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">💳</div>
        <h2 style="margin: 0; color: #059669; font-size: 24px;">Payment Successful!</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        Thank you for your payment. Here are the details:
    </p>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">{plan_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">₹{amount:.2f}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Invoice ID</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">{invoice_id}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">{datetime.now().strftime('%B %d, %Y')}</td>
            </tr>
        </table>
    </div>
    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Your subscription is now active. Enjoy all the Pro features!
    </p>
    """
    return {
        "subject": f"Payment Receipt - ₹{amount:.2f} - AfterSales.pro",
        "html": get_base_template(content, f"Payment of ₹{amount:.2f} received. Thank you!")
    }

def payment_failed_email_template(name: str, amount: float, retry_link: str) -> Dict[str, str]:
    """Payment failed email"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">⚠️</div>
        <h2 style="margin: 0; color: #dc2626; font-size: 24px;">Payment Failed</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        We couldn't process your payment of <strong>₹{amount:.2f}</strong>. This could be due to:
    </p>
    <ul style="margin: 0 0 25px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
        <li>Insufficient funds</li>
        <li>Card expired or declined</li>
        <li>Bank security block</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{retry_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Retry Payment
        </a>
    </div>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Please update your payment method to continue enjoying Pro features.
    </p>
    """
    return {
        "subject": "Payment Failed - Action Required - AfterSales.pro",
        "html": get_base_template(content, "Your payment couldn't be processed. Please retry.")
    }

def trial_ending_email_template(name: str, days_left: int, upgrade_link: str) -> Dict[str, str]:
    """Trial ending reminder"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">⏰</div>
        <h2 style="margin: 0; color: #f59e0b; font-size: 24px;">Your Trial Ends in {days_left} Day{'s' if days_left > 1 else ''}!</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        Your free trial is ending soon. Upgrade now to keep using all features:
    </p>
    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #92400e; font-size: 16px;">What you'll lose without Pro:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
            <li>Unlimited jobs & team members</li>
            <li>Inventory management</li>
            <li>Advanced analytics & profit reports</li>
            <li>Multi-branch support</li>
        </ul>
    </div>
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 5px; color: #64748b; font-size: 14px;">Launch Offer</p>
        <p style="margin: 0; color: #059669; font-size: 28px; font-weight: 700;">₹999/year</p>
        <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;"><s>₹2,500</s> - Save 60%!</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{upgrade_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Upgrade to Pro
        </a>
    </div>
    """
    return {
        "subject": f"⏰ Your trial ends in {days_left} day{'s' if days_left > 1 else ''} - AfterSales.pro",
        "html": get_base_template(content, f"Your trial ends in {days_left} days. Upgrade now!")
    }

def subscription_renewed_email_template(name: str, plan_name: str, next_billing: str) -> Dict[str, str]:
    """Subscription renewed confirmation"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">🔄</div>
        <h2 style="margin: 0; color: #059669; font-size: 24px;">Subscription Renewed!</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        Your <strong>{plan_name}</strong> subscription has been successfully renewed.
    </p>
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 5px; color: #64748b; font-size: 14px;">Next billing date</p>
        <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">{next_billing}</p>
    </div>
    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Thank you for continuing with AfterSales.pro!
    </p>
    """
    return {
        "subject": "Subscription Renewed ✅ - AfterSales.pro",
        "html": get_base_template(content, "Your subscription has been renewed successfully.")
    }

def subscription_expired_email_template(name: str, reactivate_link: str) -> Dict[str, str]:
    """Subscription expired / win-back email"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">😢</div>
        <h2 style="margin: 0; color: #dc2626; font-size: 24px;">Your Subscription Has Expired</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        We noticed your Pro subscription has expired. You've been downgraded to the Free plan with limited features.
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px; color: #991b1b; font-size: 16px;">You no longer have access to:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 1.8;">
            <li>Unlimited jobs (limited to 30/month)</li>
            <li>Inventory management</li>
            <li>Advanced analytics</li>
            <li>Multi-branch support</li>
        </ul>
    </div>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        <strong>Special offer:</strong> Reactivate today and get 20% off your next year!
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reactivate_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reactivate Pro
        </a>
    </div>
    """
    return {
        "subject": "We miss you! Your Pro subscription expired - AfterSales.pro",
        "html": get_base_template(content, "Your subscription has expired. Reactivate and get 20% off!")
    }

# ==================== ENGAGEMENT EMAILS ====================

def inactive_reminder_email_template(name: str, days_inactive: int, login_link: str) -> Dict[str, str]:
    """Inactive user reminder"""
    if days_inactive <= 7:
        emoji = "👋"
        title = "We miss you!"
        message = "It's been a few days since you last logged in."
    elif days_inactive <= 30:
        emoji = "🔔"
        title = "Your shop is waiting!"
        message = f"It's been {days_inactive} days since your last visit."
    else:
        emoji = "💭"
        title = "Remember us?"
        message = f"It's been over a month since you used AfterSales.pro."
    
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">{emoji}</div>
        <h2 style="margin: 0; color: #1e293b; font-size: 24px;">{title}</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        {message} Here's what you might be missing:
    </p>
    <ul style="margin: 0 0 25px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
        <li>Track repair jobs efficiently</li>
        <li>Send WhatsApp updates to customers</li>
        <li>Generate professional job sheets</li>
        <li>Manage your inventory</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{login_link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Log In Now
        </a>
    </div>
    <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
        Need help getting started? Just reply to this email!
    </p>
    """
    return {
        "subject": f"{emoji} {title} - AfterSales.pro",
        "html": get_base_template(content, f"{message} Log in and check your dashboard.")
    }

def first_job_congratulations_template(name: str, job_id: str) -> Dict[str, str]:
    """First job created celebration"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">🎊</div>
        <h2 style="margin: 0; color: #059669; font-size: 24px;">Congratulations on Your First Job!</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        You just created your first repair job (#{job_id})! You're officially using AfterSales.pro like a pro. 🚀
    </p>
    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 18px;">Next steps:</h3>
    <ol style="margin: 0 0 25px; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
        <li>Update the job status as you progress</li>
        <li>Send WhatsApp updates to your customer</li>
        <li>Generate a PDF job sheet</li>
        <li>Mark it complete when done!</li>
    </ol>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://aftersales.pro/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            View Your Job
        </a>
    </div>
    """
    return {
        "subject": "🎊 Congratulations on your first job! - AfterSales.pro",
        "html": get_base_template(content, "You created your first repair job! Great start!")
    }

def milestone_email_template(name: str, milestone: str, achievement: str) -> Dict[str, str]:
    """Milestone celebration email"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">🏆</div>
        <h2 style="margin: 0; color: #f59e0b; font-size: 24px;">Achievement Unlocked!</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        Wow! You've reached an amazing milestone:
    </p>
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 10px; color: #92400e; font-size: 18px; font-weight: 600;">{milestone}</p>
        <p style="margin: 0; color: #78350f; font-size: 14px;">{achievement}</p>
    </div>
    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Keep up the amazing work! Your business is growing. 📈
    </p>
    """
    return {
        "subject": f"🏆 {milestone} - AfterSales.pro",
        "html": get_base_template(content, f"Congratulations! {milestone}")
    }

def tips_and_tricks_email_template(name: str, tip_title: str, tip_content: str) -> Dict[str, str]:
    """Weekly tips email"""
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px; margin-bottom: 10px;">💡</div>
        <h2 style="margin: 0; color: #1e293b; font-size: 24px;">Pro Tip of the Week</h2>
    </div>
    <p style="margin: 0 0 15px; color: #475569; font-size: 16px; line-height: 1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 18px;">{tip_title}</h3>
        <p style="margin: 0; color: #1e3a8a; font-size: 15px; line-height: 1.6;">{tip_content}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://aftersales.pro/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Try It Now
        </a>
    </div>
    """
    return {
        "subject": f"💡 {tip_title} - AfterSales.pro",
        "html": get_base_template(content, f"Pro tip: {tip_title}")
    }

# ==================== ADMIN EMAILS ====================

def new_signup_alert_template(shop_name: str, owner_email: str, subdomain: str, plan: str) -> Dict[str, str]:
    """Alert admin about new signup"""
    content = f"""
    <h2 style="margin: 0 0 20px; color: #059669; font-size: 24px;">🎉 New Shop Signup!</h2>
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Shop Name</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{shop_name}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Owner Email</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{owner_email}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Subdomain</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{subdomain}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Plan</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">{plan}</td>
            </tr>
        </table>
    </div>
    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Time: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
    </p>
    """
    return {
        "subject": f"🎉 New Signup: {shop_name} - AfterSales.pro",
        "html": get_base_template(content, f"New shop signup: {shop_name}")
    }

def weekly_summary_template(stats: Dict[str, Any]) -> Dict[str, str]:
    """Weekly business summary for admin"""
    content = f"""
    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px;">📊 Weekly Summary</h2>
    <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.6;">
        Here's how AfterSales.pro performed this week:
    </p>
    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">New Signups</td>
                <td style="padding: 12px 0; color: #059669; font-size: 18px; text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{stats.get('new_signups', 0)}</td>
            </tr>
            <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Total Shops</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 18px; text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{stats.get('total_shops', 0)}</td>
            </tr>
            <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Active Users</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 18px; text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{stats.get('active_users', 0)}</td>
            </tr>
            <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Jobs Created</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 18px; text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{stats.get('jobs_created', 0)}</td>
            </tr>
            <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Revenue</td>
                <td style="padding: 12px 0; color: #059669; font-size: 18px; text-align: right; font-weight: 700;">₹{stats.get('revenue', 0):,.2f}</td>
            </tr>
        </table>
    </div>
    """
    return {
        "subject": f"📊 Weekly Summary - AfterSales.pro",
        "html": get_base_template(content, f"This week: {stats.get('new_signups', 0)} new signups")
    }

# ==================== EMAIL SENDING FUNCTIONS ====================

async def send_email(to_email: str, subject: str, html_content: str) -> Dict[str, Any]:
    """Send an email using Resend"""
    if not resend.api_key:
        logger.error("RESEND_API_KEY not configured")
        return {"success": False, "error": "Email service not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {subject}")
        return {"success": True, "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}

# ==================== CONVENIENCE FUNCTIONS ====================

async def send_welcome_email(to_email: str, shop_name: str, owner_name: str, subdomain: str):
    """Send welcome email to new user"""
    template = welcome_email_template(shop_name, owner_name, subdomain)
    return await send_email(to_email, template["subject"], template["html"])

async def send_password_reset_email(to_email: str, name: str, reset_link: str):
    """Send password reset email"""
    template = password_reset_email_template(name, reset_link)
    return await send_email(to_email, template["subject"], template["html"])

async def send_payment_success_email(to_email: str, name: str, plan_name: str, amount: float, invoice_id: str):
    """Send payment success receipt"""
    template = payment_success_email_template(name, plan_name, amount, invoice_id)
    return await send_email(to_email, template["subject"], template["html"])

async def send_payment_failed_email(to_email: str, name: str, amount: float, retry_link: str):
    """Send payment failed notification"""
    template = payment_failed_email_template(name, amount, retry_link)
    return await send_email(to_email, template["subject"], template["html"])

async def send_trial_ending_email(to_email: str, name: str, days_left: int, upgrade_link: str):
    """Send trial ending reminder"""
    template = trial_ending_email_template(name, days_left, upgrade_link)
    return await send_email(to_email, template["subject"], template["html"])

async def send_subscription_renewed_email(to_email: str, name: str, plan_name: str, next_billing: str):
    """Send subscription renewed confirmation"""
    template = subscription_renewed_email_template(name, plan_name, next_billing)
    return await send_email(to_email, template["subject"], template["html"])

async def send_subscription_expired_email(to_email: str, name: str, reactivate_link: str):
    """Send subscription expired notification"""
    template = subscription_expired_email_template(name, reactivate_link)
    return await send_email(to_email, template["subject"], template["html"])

async def send_inactive_reminder_email(to_email: str, name: str, days_inactive: int, login_link: str):
    """Send inactive user reminder"""
    template = inactive_reminder_email_template(name, days_inactive, login_link)
    return await send_email(to_email, template["subject"], template["html"])

async def send_first_job_email(to_email: str, name: str, job_id: str):
    """Send first job congratulations"""
    template = first_job_congratulations_template(name, job_id)
    return await send_email(to_email, template["subject"], template["html"])

async def send_milestone_email(to_email: str, name: str, milestone: str, achievement: str):
    """Send milestone achievement email"""
    template = milestone_email_template(name, milestone, achievement)
    return await send_email(to_email, template["subject"], template["html"])

async def send_new_signup_alert(shop_name: str, owner_email: str, subdomain: str, plan: str):
    """Send new signup alert to admin"""
    template = new_signup_alert_template(shop_name, owner_email, subdomain, plan)
    return await send_email(ADMIN_EMAIL, template["subject"], template["html"])

async def send_weekly_summary(stats: Dict[str, Any]):
    """Send weekly summary to admin"""
    template = weekly_summary_template(stats)
    return await send_email(ADMIN_EMAIL, template["subject"], template["html"])
