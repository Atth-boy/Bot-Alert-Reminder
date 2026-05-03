"""
Daily LINE notifier — รัน via GitHub Actions cron

ENV ที่ต้องการ:
  GAS_WEB_APP_URL          — URL ของ GAS Web App (deployed)
  LINE_CHANNEL_ACCESS_TOKEN — long-lived token จาก LINE Developers Console
"""
import os
import sys
from calendar import monthrange
from datetime import date, datetime, timezone, timedelta

import requests

GAS_URL = os.environ["GAS_WEB_APP_URL"]
LINE_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
API_SECRET = os.environ.get("API_SECRET", "")
LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"

ICT = timezone(timedelta(hours=7))


def fetch_tasks():
    params = {"secret": API_SECRET} if API_SECRET else {}
    r = requests.get(GAS_URL, params=params, timeout=30, allow_redirects=True)
    r.raise_for_status()
    body = r.json()
    if body.get("error") == "unauthorized":
        raise RuntimeError("GAS rejected request: unauthorized (check API_SECRET)")
    return body.get("data", [])


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


def should_notify(task, today):
    if task.get("Status") == "Done":
        return False
    if task.get("Is_Expired") == "Expired":
        return False

    notify_date = to_date(task.get("Notification Date"))
    if not notify_date:
        return False

    recurrence = (task.get("Recurrence") or "none").lower()

    if recurrence == "monthly":
        if today < notify_date:
            return False
        target_day = notify_date.day
        days_in_month = monthrange(today.year, today.month)[1]
        effective_day = min(target_day, days_in_month)
        return today.day == effective_day

    return notify_date == today


def main():
    today = datetime.now(ICT).date()
    tasks = fetch_tasks()
    print(f"Loaded {len(tasks)} tasks; today (ICT) = {today.isoformat()}")

    sent = 0
    for t in tasks:
        if not should_notify(t, today):
            continue

        recipient = (t.get("Recipient") or "").strip()
        if not recipient:
            print(f"[skip] empty recipient row={t.get('_row')}")
            continue

        due = to_date(t.get("Due Date"))
        due_str = due.isoformat() if due else "-"
        recur_tag = " (รายเดือน)" if (t.get("Recurrence") or "").lower() == "monthly" else ""
        msg = (
            f"แจ้งเตือน{recur_tag}: {t.get('Topic', '')}\n"
            f"{t.get('Detail', '')}\n"
            f"ครบกำหนด: {due_str}"
        )
        if send_line(recipient, msg):
            sent += 1

    print(f"Sent {sent} notifications")


if __name__ == "__main__":
    main()
