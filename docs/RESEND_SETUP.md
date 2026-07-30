# Resend Domain Verification Guide

## Why Verify a Domain?

Resend's free tier allows sending emails only to the account owner's email address. To send emails to your customers and tenants, you need to verify a custom sending domain.

## Steps to Verify Your Domain

### 1. Log in to Resend
Go to [https://resend.com/domains](https://resend.com/domains) and sign in with your account.

### 2. Add Your Domain
Click "Add Domain" and enter your domain (e.g., `aftersales.pro`).

### 3. Add DNS Records
Resend will provide DNS records to add to your domain:
- **SPF Record** - Authorizes Resend to send on your behalf
- **DKIM Records** - Digitally signs your emails
- **MX Record** (optional) - For receiving bounce notifications

Add these records to your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.).

### 4. Verify the Domain
Click "Verify" in Resend dashboard. DNS propagation can take up to 48 hours, but usually completes in minutes.

### 5. Update AfterSales.pro Configuration
Once verified, update your backend `.env`:

```env
SENDER_EMAIL="AfterSales.pro <hello@aftersales.pro>"
```

Restart the backend:
```bash
sudo systemctl restart aftersales-backend
```

## Recommended Sender Addresses

- `hello@aftersales.pro` - General communications
- `noreply@aftersales.pro` - Transactional emails
- `support@aftersales.pro` - Support-related emails

## Testing

After verification, test by triggering a forgot password email:
1. Go to `/forgot-password`
2. Enter your email and subdomain
3. Check your inbox for the reset link

## Current Configuration

```
API Key: re_FuKNR2b1_BUCJ6kfmt4euBEcHVvbgyBFd
Current Sender: AfterSales.pro <onboarding@resend.dev> (test mode)
Admin Email: admin@aftersales.pro
```

## Troubleshooting

### Emails not sending
- Check `/var/log/supervisor/backend.err.log` for errors
- Verify API key is correct in `.env`
- Ensure domain verification is complete

### Emails going to spam
- Verify SPF, DKIM, and DMARC records are properly configured
- Use a professional sender address
- Avoid spam trigger words in subject lines
