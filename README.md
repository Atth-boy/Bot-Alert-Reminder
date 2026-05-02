# ระบบแจ้งเตือนผ่าน LINE Bot

PWA สำหรับกรอกข้อมูล + ระบบแจ้งเตือนอัตโนมัติผ่าน LINE Bot

ดูรายละเอียดสถาปัตยกรรมที่ [CLAUDE.md](./CLAUDE.md)

---

## โครงสร้างโปรเจค

```
.
├── frontend/              # Vue 3 + Vite + PWA
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── gas/                   # Google Apps Script (backend)
│   ├── Code.gs
│   └── appsscript.json
├── notifier/              # Python LINE notifier
│   ├── notify.py
│   └── requirements.txt
├── .github/workflows/
│   ├── notify.yml         # Cron daily 08:00 ICT
│   └── deploy.yml         # Deploy frontend → GitHub Pages
├── CLAUDE.md
└── README.md
```

---

## ขั้นตอน Setup (ทำทีละข้อ)

### 1. Google Sheets + Apps Script

1. สร้าง Google Sheet ใหม่ → จดค่า `SHEET_ID` จาก URL
2. เปิด **Extensions → Apps Script**
3. คัดลอกไฟล์ทั้งหมดในโฟลเดอร์ `gas/` ไปวาง:
   - `Code.gs` → tab "Code.gs"
   - `appsscript.json` → เปิด **Project Settings → Show appsscript.json** แล้ววางทับ
4. รันฟังก์ชัน `setupSheet()` ครั้งเดียว (ให้ permission)
5. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด Deploy → Copy URL (`https://script.google.com/macros/s/.../exec`)

### 2. LINE Messaging API

1. ไปที่ https://developers.line.biz/console/
2. สร้าง **Provider** → **Messaging API channel**
3. ในแท็บ **Messaging API**:
   - Issue **Channel access token (long-lived)** → เก็บไว้
   - เพิ่มเพื่อนกับ bot เพื่อทดสอบ
4. หา **User ID** ของผู้รับ:
   - วิธีง่ายสุด: ใช้ webhook จับ event แล้ว log `userId`
   - หรือใช้ Group ID ถ้า bot ถูกเชิญเข้ากลุ่ม

### 3. GitHub Repository

1. Push โปรเจคนี้ขึ้น GitHub repo
2. ไปที่ **Settings → Secrets and variables → Actions** เพิ่ม secrets:
   | Name | Value |
   |---|---|
   | `GAS_WEB_APP_URL` | URL จากข้อ 1.5 |
   | `LINE_CHANNEL_ACCESS_TOKEN` | Token จากข้อ 2.3 |

### 4. GitHub Pages

1. **Settings → Pages**
2. Source: **GitHub Actions**
3. Push ไฟล์ใน `frontend/` → workflow `deploy.yml` จะรันอัตโนมัติ
4. หลัง deploy แรก จะได้ URL: `https://<username>.github.io/<repo>/`

> ก่อน push ครั้งแรก ต้องรัน `cd frontend && npm install` เพื่อ generate `package-lock.json` ในเครื่องตัวเอง แล้ว commit ก่อน

### 5. ทดสอบระบบ

- เปิดหน้าเว็บ → กรอกข้อมูล (ใส่ Notification Date เป็น "วันนี้")
- ไปที่ **Actions → Daily LINE Notifier → Run workflow** เพื่อ trigger ด้วยมือ
- ตรวจ LINE ว่าได้รับข้อความหรือไม่

---

## Local Development

### Frontend
```bash
cd frontend
cp .env.example .env
# แก้ VITE_GAS_URL ใน .env
npm install
npm run dev
```

### Notifier (test)
```bash
cd notifier
pip install -r requirements.txt
$env:GAS_WEB_APP_URL = "https://..."
$env:LINE_CHANNEL_ACCESS_TOKEN = "..."
python notify.py
```

---

## Schedule

GitHub Actions cron รันที่ **08:00 Asia/Bangkok** (= 01:00 UTC) ทุกวัน
ปรับได้ที่ `.github/workflows/notify.yml` field `cron`
