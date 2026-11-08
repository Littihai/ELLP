# ELLP — English Learning Language Platform

แพลตฟอร์มเรียนภาษาอังกฤษผ่านวิดีโอแบบ Gamification: ดูเพลง → ทำแบบทดสอบสั้น ๆ → ได้ XP → เลื่อนเลเวล → ทำเควสต์ → ปลดล็อกวิดีโอถัดไป
ออกแบบสำหรับผู้เรียนวัยเด็กและครูผู้ดูแล **เวอร์ชัน 1.0.0** เป็นเดโมแบบกดทดสอบได้ทุกหน้า ใช้ข้อมูลสมมติ ไม่ต้องมีบัญชีหรือเซิร์ฟเวอร์
เหมาะสำหรับส่งให้ผู้สมัครงานหรือทีมพัฒนาดูเป็นโจทย์ตั้งต้น

English version: [README.md](README.md) · บันทึกส่งมอบงานสำหรับนักพัฒนา: [docs/handover.md](docs/handover.md)

## แยกสองฝั่งชัดเจน

| | ผู้เรียน (`/login` → `/app`) | คอนโซลผู้ดูแล (`/admin/login` → `/admin`) |
|---|---|---|
| ใคร | เด็ก (หรือผู้ปกครองที่ใช้บัญชีของเด็ก) | ผู้ดูแลระบบ เจ้าของสื่อ ครู |
| หน้าแรก | เลเวล แถบ XP สตรีค บทเรียนถัดไป เควสต์วันนี้ เหรียญตรา | ภาพรวม: จำนวนผู้เรียน เข้าเรียนวันนี้ ข้อความรอตอบ กราฟ XP 14 วัน |
| เนื้อหา | โปรแกรม → บทเรียน → เครื่องเล่น YouTube คำศัพท์ แบบทดสอบ | เจ้าของสื่อ (ผู้เช่า) โปรแกรม บทเรียนพร้อมตัวแก้ไขแบบทดสอบและเงื่อนไขปลดล็อก เควสต์ |
| เกม | เควสต์ (รายวัน/รายสัปดาห์/ระยะยาว) กระดานผู้นำ โปรไฟล์พร้อมเหรียญตราและประวัติ XP | สมาชิก (บทบาท การเข้าร่วมโปรแกรม) ตั้งค่า (อีเมล กระดานผู้นำ) |
| ติดต่อ | ส่งข้อความถึงครู อ่านคำตอบ | กล่องข้อความ: ตอบกลับทางอีเมล; Mail log บอกว่าส่งจริง เปลี่ยนเส้นทาง หรือระงับ |

## Gamification สรุปสั้น ๆ

ดูวิดีโอถึง **80 %** ได้ XP ของบทเรียน (50–60) แบบทดสอบได้ **10 XP ต่อข้อถูก + โบนัส 20 เมื่อเต็ม** ทำซ้ำได้เฉพาะส่วนที่ดีขึ้น
กิจกรรมแรกของวันขยับ **สตรีค** (+5 XP ต่อวันติดต่อกัน สูงสุด 25) **เลเวล** 1–10 ที่ 0 / 100 / 250 / 500 / 900 / 1400 / 2000 / 2800 / 3800 / 5000 XP
**เควสต์** นับจำนวนวิดีโอ แบบทดสอบที่ผ่าน XP หรือวันสตรีค เป็นรายวัน รายสัปดาห์ หรือตลอดไป ให้ XP และเหรียญตรา
**เงื่อนไขปลดล็อก** ของบทเรียน (จบบท X, ถึงเลเวล N, มี XP ≥ N, ทำเควสต์ Q สำเร็จ, สตรีค N วัน) ต้องผ่านทุกข้อวิดีโอจึงเปิด
เดโมเริ่มที่ **Baby Shark** จบแล้วปลดล็อก *The Wheels on the Bus* ต่อไปเรื่อย ๆ กฎฉบับเต็ม: [docs/gamification.md](docs/gamification.md)

## รองรับหลายเจ้าของ (Multi-tenant)

**เจ้าของสื่อ** (โรงเรียน สำนักพิมพ์ ครอบครัว) มีโปรแกรม บทเรียน เควสต์ สมาชิก กล่องข้อความ และการตั้งค่าอีเมลของตนเอง
**ผู้ดูแลระบบ (Super Admin)** เพิ่ม/ลดเจ้าของได้ **เจ้าของ** จัดการผู้ดูแลและผู้เรียน **ผู้ดูแล (ครู)** จัดการเนื้อหาและตอบข้อความ
ผู้เรียนเห็นเฉพาะสังกัดของตนเอง ดูเหตุผลที่ [docs/decisions/0002-multi-tenant-owners.md](docs/decisions/0002-multi-tenant-owners.md)

## เทคโนโลยี

- **Frontend**: React 19, TypeScript, Vite, react-router; ใช้ design tokens และแนวทาง UI จากโปรเจกต์ TMCL-PR
  (ธีมสว่าง/มืด พจนานุกรมไทย/อังกฤษ ไอคอน Octicons ไม่ฝังข้อความในโค้ด)
- **Backend**: C# / ASP.NET Core 9 Web API, Firebase Admin SDK (ตรวจ ID token, Firestore), MailKit (SMTP พร้อมโหมดทดสอบ), xUnit
  กฎทั้งหมดเป็น static class ล้วนและมี test
- **Firebase**: Authentication (อีเมล/รหัสผ่าน), Firestore (ข้อมูล ผ่าน service account ของ API), Hosting (ทางเลือก)
- **โหมดทดลอง**: frontend ทำงานบน store ในหน่วยความจำที่เก็บใน localStorage; API มี store ในหน่วยความจำและโหมด header `X-Demo-User`
  ดูเหตุผลที่ [docs/decisions/0003-demo-mode.md](docs/decisions/0003-demo-mode.md)

## วิธีรัน

ต้องมี Node.js 22 ขึ้นไป และ .NET SDK 9 (API ไม่จำเป็นสำหรับเดโม)

```bash
cd frontend && npm ci && npm run dev
```

เปิด http://localhost:5174 แล้วคลิกบัญชีทดลองในหน้าเข้าสู่ระบบ (รหัสผ่านแสดงไว้ในหน้า: `ellp-demo`)

| บัญชี | อีเมล | บทบาท |
|---|---|---|
| น้องมิ้นท์ | mint.parent@example.com | ผู้เรียน เรียนชุดที่ 1 ไปครึ่งทาง |
| Nong Pim (new) | pim.parent@example.com | ผู้เรียนใหม่ ยังไม่มีความคืบหน้า |
| Teacher Ann | ann@sunshine.example.com | ผู้ดูแลของโรงเรียนอนุบาลซันไชน์ |
| คุณครูใหญ่ สมศรี | principal@sunshine.example.com | เจ้าของโรงเรียนอนุบาลซันไชน์ |
| Platform Admin | super@ellp.example.com | ผู้ดูแลระบบ (หน้าเจ้าของสื่อ ทุกสังกัด) |

API (ทางเลือก, store ในหน่วยความจำ, Swagger ที่ http://localhost:5220/swagger):

```bash
dotnet run --project backend/Ellp.Api
```

ทดสอบและตรวจ:

```bash
dotnet test backend/Ellp.Api.Tests/Ellp.Api.Tests.csproj
```

```bash
cd frontend && npx tsc --noEmit && npm run build
```

ขึ้นระบบจริงกับ Firebase: [firebase/README.md](firebase/README.md) และ [docs/dev-setup.md](docs/dev-setup.md)

## เอกสาร

[docs/architecture.md](docs/architecture.md) · [docs/data-model.md](docs/data-model.md) · [docs/gamification.md](docs/gamification.md) ·
[docs/dev-setup.md](docs/dev-setup.md) · [docs/roadmap.md](docs/roadmap.md) · [docs/handover.md](docs/handover.md) ·
[docs/decisions](docs/decisions) · [CHANGELOG.md](CHANGELOG.md)

## ข้อจำกัดของ 1.0.0 (ตามจริง)

- ความคืบหน้าการดูในเดโมใช้ตัวจับเวลาและปุ่ม "ดูจบแล้ว (จำลอง)"; โหมดจริงควรใช้ตำแหน่งจริงจาก YouTube IFrame API
- YouTube id ในข้อมูลตั้งต้นชี้ไปที่เพลงเด็กที่รู้จักกันดี ควรตรวจทุกตัวก่อนออกเวอร์ชันจริงและเคารพลิขสิทธิ์ของเจ้าของสื่อ
- Firestore store และการเข้าสู่ระบบผ่าน Firebase เขียนไว้แล้วแต่ยังไม่ได้ทดสอบกับโปรเจกต์จริงในเวอร์ชันนี้
- อีเมลใช้ตัวส่งแบบบันทึก log อย่างเดียวจนกว่าจะตั้งค่า SMTP; โหมดทดสอบเปิดไว้เป็นค่าเริ่มต้น
- ยังไม่มี UI test อัตโนมัติ; backend มี test กฎและเอนจิน 42 รายการ

## สัญญาอนุญาต

ยังไม่ได้เลือก จนกว่าจะเพิ่มไฟล์สัญญาอนุญาต สงวนสิทธิ์ทั้งหมดโดยผู้เขียน
