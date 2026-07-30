"""Manual probe: send one real email to the Resend-verified account owner address
to prove end-to-end delivery works. Run explicitly:  python manual_resend_probe.py
"""
import asyncio
import sys

sys.path.insert(0, "/app/backend")
import email_service as es  # noqa: E402


async def main():
    res = await es.send_email(
        "aftersales@thegoodmen.in",
        "TEST_probe AfterSales.pro email integration",
        "<p>Automated QA probe - integration check.</p>",
    )
    print(res)


asyncio.run(main())
