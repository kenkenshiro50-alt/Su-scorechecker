### 7.1 ตารางส่วนร่วม

| ชื่อ-สกุล | รหัสนักศึกษา | ชิ้นงานที่รับผิดชอบ (ไฟล์ / component / route / DSA) | ช่วงที่นำเสนอในคลิป |
| :--- | :--- | :--- | :--- |
| **นายกฤตนัน จุลกลับ** | 681310394 | **Backend (Express), API & DSA:**<br>- `backend/server.js` (API Proxy, In-Memory Cache, Fallback Handler, Player Roster Route `/api/teams/:id/players`)<br>- Routes & DSA: Selection/Insertion/Bubble Sort, Queue (FIFO), Stack (LIFO) | - ช่วงที่ 1: เปิดและตารางส่วนร่วม<br>- ช่วงที่ 4: เบื้องหลังระบบ (ฝั่ง Express & API)<br>- ช่วงที่ 5: DSA เชิงลึก (Big-O & เทียบก่อน-หลัง) |
| **นายนานาวินลี** | 681310016 | **Frontend (React + Vite) & UX:**<br>- `frontend/src/App.jsx` (Main State & Component Tree)<br>- Components: `StandingsTable`, `MatchList`, `QueuePanel`, `HistoryPanel`, `PlayerRosterModal`<br>- **UX:** จัดการสถานะ `loading / empty / error / success` และฟีเจอร์ดูรายชื่อนักกีฬา | - ช่วงที่ 2: จากงานแรกสู่งานนี้ (Before → After)<br>- ช่วงที่ 3: Demo ระบบจริง (User Journey)<br>- ช่วงที่ 6: สรุปผลงานและข้อจำกัด |

### 7.2 ตารางข้อแนะนำจากงานแรก สิ่งที่แก้

| ข้อแนะนำจากงานแรก | สิ่งที่แก้ในงานนี้ | หลักฐาน Before / After |
| :--- | :--- | :--- |
| **1. โครงสร้างรวม Frontend ไว้ใน Backend** *(เดิมใช้ `express.static('public')`)* | แยก Frontend ออกมาเป็น **React + Vite** (`frontend/`) และให้ Express (`backend/`) ทำหน้าที่เป็น API Server อย่างเดียว | **Before:** ไฟล์หน้าเว็บรวมอยู่ใน `public/` ของ Express<br>**After:** แยกโฟลเดอร์เด็ดขาดระหว่าง `frontend/` และ `backend/` พร้อมแผนภาพ Component Tree |
| **2. อยากให้ระบบมีฟีเจอร์เชิงลึกตามคำแนะนำ** *(เดิมมีแค่ผลสกอร์และตารางคะแนนรวม)* | เพิ่มฟีเจอร์ **ดูรายชื่อนักกีฬาประจำทีม (Player Roster)** เมื่อคลิกที่ชื่อทีม เพื่อตอบโจทย์ผู้ใช้ที่ต้องการดูรายละเอียดเชิงลึก | **Before:** ดูได้แค่คะแนนรวมภาพรวมของทีม<br>**After:** คลิกชื่อทีมเพื่อเปิด `PlayerRosterModal` ดูรายชื่อ ตำแหน่ง และเบอร์เสื้อได้ทันที |
| **3. สถานะ UX ยังไม่ครบถ้วน** *(ไม่มีการแจ้งสถานะตอนโหลดหรือตอน API พัง)* | เพิ่ม UX States ครบทั้ง **loading / empty / error / success** พร้อมระบบ Fallback ป้องกันเว็บล่มเมื่อ API ภายนอกขัดข้อง | **Before:** หน้าเว็บนิ่งหรือพังเมื่อโหลดข้อมูลไม่ได้<br>**After:** มี Loading spinner, ข้อความแจ้ง Empty/Error ที่เข้าใจง่าย และระบบ Fallback |

[คลิกที่นี่เพื่อดูคลิปวิดีโอพรีเซนต์โปรเจกต์](https://youtu.be/01IVkIZJGMc,)
