"""
Daily LINE notifier — รัน via GitHub Actions cron

ENV ที่ต้องการ:
  GAS_WEB_APP_URL          — URL ของ GAS Web App (deployed)
  LINE_CHANNEL_ACCESS_TOKEN — long-lived token จาก LINE Developers Console
"""
import os
import sys
from datetime import date, datetime, timezone, timedelta

import requests

GAS_URL = os.environ["GAS_WEB_APP_URL"]
LINE_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"

ICT = timezone(timedelta(hours=7))


def fetch_tasks():
    r = requests.get(GAS_URL, timeout=30, allow_redirects=True)
    r.raise_for_status()
    return r.json().get("data", [])


def to_date(value):
    if not value:
        return None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(ICT).date()
        except ValueError:
            return None
    return None


def send_line(to: str, message: str) -> bool:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LINE_TOKEN}",
    }
    payload = {
        "to": to,
        "messages": [{"type": "text", "text": message}],
    }
    r = requests.post(LINE_PUSH_URL, json=payload, headers=headers, timeout=30)
    if r.status_code >= 400:
        print(f"[LINE error] {r.status_code} {r.text}", file=sys.stderr)
        return False
    return True


def main():
    today = datetime.now(ICT).date()
    tasks = fetch_tasks()
    print(f"Loaded {len(tasks)} tasks; today (ICT) = {today.isoformat()}")

    sent = 0
    for t in tasks:
        notify_on = to_date(t.get("Notification Date"))
        if notify_on != today:
            continue
        if t.get("Is_Expired") == "Expired":
            continue

        recipient = (t.get("Recipient") or "").strip()
        if not recipient:
            print(f"[skip] empty recipient row={t.get('_row')}")
            continue

        due = to_date(t.get("Due Date"))
        due_str = due.isoformat() if due else "-"
        msg = (
            f"แจ้งเตือน: {t.get('Topic', '')}\n"
            f"{t.get('Detail', '')}\n"
            f"ครบกำหนด: {due_str}"
        )
        if send_line(recipient, msg):
            sent += 1

    print(f"Sent {sent} notifications")


if __name__ == "__main__":
    main()
