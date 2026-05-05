"""
Daily LINE notifier — รัน via GitHub Actions cron

ENV ที่ต้องการ:
  GAS_WEB_APP_URL           — URL ของ GAS Web App (deployed)
  LINE_CHANNEL_ACCESS_TOKEN — long-lived token จาก LINE Developers Console
  API_SECRET                — (optional) secret ที่ตั้งใน GAS Script Properties
  DEBUG                     — ถ้า set เป็น "1" จะ print ทุก task + skip reason (ไม่ส่งจริง)
"""
import os
import sys
from calendar import monthrange
from datetime import date, datetime, timezone, timedelta

import requests

GAS_URL = os.environ["GAS_WEB_APP_URL"]
LINE_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
API_SECRET = os.environ.get("API_SECRET", "")
DEBUG = os.environ.get("DEBUG", "").strip() == "1"
LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"

ICT = timezone(timedelta(hours=7))


def fetch_tasks():
    params = {"secret": API_SECRET} if API_SECRET else {}
    print(f"[GAS] fetching: {GAS_URL[:60]}...")
    r = requests.get(GAS_URL, params=params, timeout=30, allow_redirects=True)
    print(f"[GAS] status={r.status_code} content_type={r.headers.get('Content-Type', '')}")
    r.raise_for_status()
    body = r.json()
    if body.get("error") == "unauthorized":
        raise RuntimeError("GAS rejected request: unauthorized (check API_SECRET)")
    tasks = body.get("data", [])
    print(f"[GAS] received {len(tasks)} rows")
    return tasks


def to_date(value):
    """แปลง value จาก GAS JSON เป็น date (ICT) — รองรับหลาย format"""
    if not value:
        return None
    if isinstance(value, str):
        v = value.strip()
        if not v:
            return None
        # ISO 8601 with Z or offset (จาก JSON.stringify(date) ใน GAS)
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(ICT).date()
        except ValueError:
            pass
        # Plain date string เช่น "2024-05-05" หรือ "05/05/2024"
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(v, fmt).date()
            except ValueError:
                pass
        print(f"[warn] cannot parse date: {v!r}", file=sys.stderr)
        return None
    # บางกรณี GAS ส่งมาเป็น number (serial date) — ไม่น่าเกิด แต่รองรับไว้
    if isinstance(value, (int, float)):
        try:
            epoch = datetime(1899, 12, 30, tzinfo=timezone.utc) + timedelta(days=float(value))
            return epoch.astimezone(ICT).date()
        except Exception:
            pass
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
        print(f"[LINE error] status={r.status_code} body={r.text}", file=sys.stderr)
        return False
    print(f"[LINE] sent to {to[:12]}... status={r.status_code}")
    return True


def skip_reason(task, today) -> str | None:
    """คืน reason ถ้าจะ skip, None ถ้าควรส่ง"""
    if task.get("Status") == "Done":
        return "Status=Done"
    if task.get("Is_Expired") == "Expired":
        return "Is_Expired=Expired"
    notify_date = to_date(task.get("Notification Date"))
    if not notify_date:
        return f"Notification Date ว่างหรือ parse ไม่ได้: {task.get('Notification Date')!r}"
    recurrence = (task.get("Recurrence") or "none").lower()
    if recurrence == "monthly":
        if today < notify_date:
            return f"monthly: ยังไม่ถึงวันเริ่ม ({notify_date})"
        target_day = notify_date.day
        days_in_month = monthrange(today.year, today.month)[1]
        effective_day = min(target_day, days_in_month)
        if today.day != effective_day:
            return f"monthly: today={today.day} != effective_day={effective_day}"
        return None
    if notify_date != today:
        return f"Notification Date={notify_date} != today={today}"
    return None


def main():
    today = datetime.now(ICT).date()
    print(f"Today (ICT) = {today.isoformat()}  DEBUG={DEBUG}")

    tasks = fetch_tasks()
    if not tasks:
        print("No tasks returned from GAS — nothing to notify")
        return

    sent = 0
    for t in tasks:
        topic = t.get("Topic", "(no topic)")
        reason = skip_reason(t, today)

        if DEBUG:
            nd_raw = t.get("Notification Date")
            nd_parsed = to_date(nd_raw)
            print(
                f"  row={t.get('_row')} topic={topic!r} "
                f"notify_date_raw={nd_raw!r} notify_date_parsed={nd_parsed} "
                f"status={t.get('Status')} expired={t.get('Is_Expired')} "
                f"recurrence={t.get('Recurrence')} "
                f"→ {'SEND' if reason is None else f'SKIP ({reason})'}"
            )

        if reason is not None:
            if not DEBUG:
                print(f"[skip] row={t.get('_row')} topic={topic!r} reason={reason}")
            continue

        recipient = (t.get("Recipient") or "").strip()
        if not recipient:
            print(f"[skip] row={t.get('_row')} empty recipient")
            continue

        due = to_date(t.get("Due Date"))
        due_str = due.isoformat() if due else "-"
        recur_tag = " (รายเดือน)" if (t.get("Recurrence") or "").lower() == "monthly" else ""
        msg = (
            f"แจ้งเตือน{recur_tag}: {t.get('Topic', '')}\n"
            f"{t.get('Detail', '')}\n"
            f"ครบกำหนด: {due_str}"
        )

        if DEBUG:
            print(f"  [DRY RUN] would send to {recipient}: {msg!r}")
        else:
            if send_line(recipient, msg):
                sent += 1

    print(f"Sent {sent} notifications")


if __name__ == "__main__":
    main()
