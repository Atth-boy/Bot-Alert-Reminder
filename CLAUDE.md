# ระบบแจ้งเตือนผ่าน LINE Bot

## Overview
เว็บแอปสำหรับกรอกข้อมูลและแจ้งเตือนอัตโนมัติผ่าน LINE Bot เมื่อถึงวันที่กำหนด

---

## Architecture

```
Frontend (PWA)          Backend / DB              Automation
────────────────        ────────────────          ────────────────
React or Vue (Vite)  →  Google Apps Script    →   GitHub Actions (Cron)
PWA (installable)       (Web App / API)            Python or Node.js
GitHub Pages            Google Sheets              LINE Messaging API
```

### Stack
| Layer | Technology | Note |
|---|---|---|
| Frontend | React หรือ Vue + Vite | ตั้งค่าเป็น PWA |
| Hosting | GitHub Pages | ฟรี ต่อตรงกับ repo |
| Database | Google Sheets | เก็บข้อมูลดิบทั้งหมด |
| API Layer | Google Apps Script (GAS) | รับ/ส่งข้อมูลระหว่าง frontend กับ Sheets |
| Notifier | GitHub Actions + Python/Node.js | Cron Job รันทุกเช้า |
| Notification | LINE Messaging API | ยิงแจ้งเตือนตาม Notification Date |

---

## Data Fields
| Field | Type | Note |
|---|---|---|
| Topic | String | หัวข้อ |
| Detail | String | รายละเอียด |
| Due Date | Date | วันครบกำหนด |
| Recipient | String | ผู้รับแจ้งเตือน (LINE User ID หรือ Group) |
| Status | String | Active / Expired |
| Notification Date | Date | Default = Due Date - 1 วัน |

---

## Google Sheets Structure

### Sheet: `Main_Data`
เก็บข้อมูลดิบทั้งหมด พร้อมคอลัมน์พิเศษ:

```
Is_Expired = =IF(C2 < TODAY(), "Expired", "Active")
```

ระบบแบ่งสถานะรายการโดยอัตโนมัติผ่านสูตรนี้ ไม่ต้องอัปเดต Status มือ

---

## Frontend (PWA) Requirements

- **Tab / Filter**: แยกแสดงรายการ "ระหว่างใช้งาน (Active)" กับ "ผ่าน Due Date แล้ว (Expired)"
- **PWA**: ติดตั้งบนมือถือได้ (installable, offline-ready)
- **Notification Date Default**: ตั้ง default อัตโนมัติเป็น Due Date - 1 วัน เพื่อลดขั้นตอนกรอก

---

## Automation Flow (GitHub Actions)

1. Cron Job รันทุกเช้า (เช่น 08:00 ICT)
2. ดึงข้อมูลจาก Google Sheets ผ่าน GAS API
3. เช็ครายการที่ `Notification Date == วันนี้`
4. ยิง LINE Messaging API ไปหา Recipient

---

## Environment Variables (ห้าม commit ลง git)
```
LINE_CHANNEL_ACCESS_TOKEN=
GAS_WEB_APP_URL=
GOOGLE_SHEET_ID=
```

---

## Decisions & Notes
- ใช้ PWA แทน Native App เพราะ deploy ผ่าน GitHub Pages ได้เลย ไม่ต้องผ่าน App Store
- GAS ทำหน้าที่เป็น serverless backend ฟรี ไม่ต้องมี server
- GitHub Actions เป็น Cron ฟรีสำหรับ public repo (2,000 min/month สำหรับ private)
