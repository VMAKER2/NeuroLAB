# NeuroLAB — เว็บไซต์เรียนรู้ BCI & คลื่นสมอง EEG แบบ Interactive ตั้งแต่ศูนย์

**NeuroLAB** คือสมุดแล็บเชิงโต้ตอบสำหรับนักเรียน นักศึกษา และผู้เริ่มต้นที่อยากเข้าใจ **Brain-Computer Interface (BCI)** และการวัดคลื่นไฟฟ้าสมอง **EEG (Electroencephalography)** ตั้งแต่พื้นฐานเซลล์ประสาท ระบบวางอิเล็กโทรด 10-20 การกรองสัญญาณดิจิทัล ไปจนถึงพาราไดม์หลักทั้ง 3 (**P300**, **SSVEP**, **Motor Imagery**) และการเขียนโค้ด **MNE-Python + Scikit-learn**

---

## 1. วิธีเปิดใช้งานในเครื่อง (รองรับทั้งดับเบิลคลิก `index.html` และ Web Server)

เราได้รวมโมดูลทั้งหมดไว้ใน [`dist/app.bundle.js`](./dist/app.bundle.js) เรียบร้อยแล้ว ทำให้สามารถเปิดได้ 2 วิธี:

1. **ดับเบิลคลิกไฟล์ `index.html` ได้ทันที (`file://`)**
   - เปิดไฟล์ `C:\NeuroLAB\index.html` บน Chrome หรือ Edge ได้โดยตรง และคลิกเปลี่ยนหมวดหมู่ได้ครบทุกหน้า (`แผนที่ 12 ด่าน`, `สมอง 3D & หมวก 10-20`, `บทเรียน 1–12`, `EEG Simulator`, `คลังคำศัพท์`) โดยไม่ติดบล็อก CORS ของ ES Modules
2. **รันผ่าน Local Web Server (แนะนำเมื่อต้องการโหลดไฟล์โมเดล `.glb` ภายนอก)**
   ```powershell
   cd C:\NeuroLAB
   python -m http.server 5173 --bind 127.0.0.1
   ```
   แล้วเปิด `http://127.0.0.1:5173/#/`

> **หมายเหตุสำหรับนักพัฒนา:** หากมีการแก้ไขโค้ดต้นฉบับในโฟลเดอร์ `js/` ให้รันคำสั่ง `python build.py` เพื่ออัปเดตไฟล์ `dist/app.bundle.js`

---

## 2. วิธี Deploy ขึ้น GitHub Pages

โปรเจกต์นี้เตรียมไฟล์ [`.nojekyll`](./.nojekyll) และ GitHub Actions Workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ไว้ให้พร้อมแล้ว และใช้พาธแบบสัมพัทธ์ (`./...`) ทั้งหมด จึงทำงานได้ทั้งบน Root domain และ Subfolder (`https://<username>.github.io/<repo-name>/`)

### ขั้นตอน:
```powershell
cd C:\NeuroLAB
git init
git add .
git commit -m "Initial commit: NeuroLAB BCI & EEG learning platform"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```
จากนั้นไปที่หน้า GitHub Repository → **Settings** → **Pages** → ในหัวข้อ **Build and deployment (Source)** เลือก **GitHub Actions** (หรือเลือก **Deploy from a branch** → `main` / `/ (root)`) เว็บจะออนไลน์ทันที

---

## 3. วิธี Deploy ขึ้น Firebase Hosting

โปรเจกต์นี้มีไฟล์ตั้งค่า [`firebase.json`](./firebase.json) พร้อมแล้ว (กำหนด `"public": "."` และตัดไฟล์สำหรับพัฒนาออกให้อัตโนมัติ)

### ขั้นตอน:
```powershell
npm install -g firebase-tools
firebase login
cd C:\NeuroLAB
firebase init hosting   # เลือกโปรเจกต์ Firebase ของคุณ และใช้ค่าใน firebase.json เดิม
firebase deploy --only hosting
```

---

## 4. โครงสร้างโฟลเดอร์

```text
C:\NeuroLAB
├── index.html                  # หน้าหลักของแอปพลิเคชัน
├── dist/
│   └── app.bundle.js           # ไฟล์รวมโมดูลทั้งหมด (รองรับ file://, GitHub Pages, Firebase)
├── build.py                    # สคริปต์รวมไฟล์จาก js/ ไปยัง dist/app.bundle.js
├── firebase.json               # ตั้งค่าสำหรับ Firebase Hosting
├── .nojekyll                   # ป้องกัน Jekyll บล็อกไฟล์บน GitHub Pages
├── .github/workflows/deploy.yml# GitHub Actions สำหรับ Deploy ขึ้น GitHub Pages อัตโนมัติ
├── css/
│   ├── tokens.css              # สีประจำกลีบสมอง ฟอนต์ และตัวแปรดีไซน์สมุดแล็บ
│   ├── base.css                # รีเซ็ตและพื้นหลังกระดาษกราฟ (#FBF7F0)
│   ├── components.css          # ปุ่มแบบกดยุบจริง การ์ดขอบหมึก ควิซ และมาสคอต
│   ├── pages.css               # เลย์เอาต์หน้า Home, 3D Brain Explorer, Lesson, Glossary
│   ├── widgets-a.css           # สไตล์ของเล่นประจำด่านที่ 1–6
│   └── widgets-b.css           # สไตล์ของเล่นประจำด่านที่ 7–12 และ Playground
└── js/                         # ซอร์สโค้ดแยกตามโมดูล
    ├── app.js                  # SPA Hash Router และควบคุมแถบสถิติ XP / Streak
    ├── store.js                # บันทึกความคืบหน้า XP และตราประทับใน localStorage
    ├── util.js                 # DOM helper, แอนิเมชัน และ PRNG
    ├── brain/                  # โมเดลสมอง 3D และหมวกอิเล็กโทรด 10-20 (Three.js)
    ├── data/                   # ข้อมูลสมอง 19 ส่วน, พิกัด 10-20, บทเรียน 12 ด่าน, คำศัพท์
    ├── signal/                 # สังเคราะห์คลื่นสมอง Biquad filter, filtfilt, FFT, Welch PSD
    ├── pages/                  # หน้า Home, Explore, Lesson, Playground, Glossary
    └── widgets/                # ของเล่น Interactive ทั้ง 12 ด่าน
```

---

## 5. วิธีนำโมเดลสมอง 3D ภายนอก (`.glb`) มาใส่แทนที่โมเดลเริ่มต้น

โดยค่าเริ่มต้น `NeuroLAB` จะสร้างสมอง 3 มิติที่มีรอยหยัก (Gyri/Sulci) แยกตามกลีบสมอง โครงสร้างส่วนลึก และหมวกอิเล็กโทรด 10-20 ให้ทันทีด้วยโค้ด (`js/brain/proceduralBrain.js`)

หากต้องการใช้ไฟล์ `.glb` ความละเอียดสูง (เช่น จาก **Z-Anatomy** CC BY-SA):
1. ตั้งชื่อ Mesh ใน Blender ให้ตรงกับ `meshName` หรือ `id` ใน [`js/data/regions.js`](./js/data/regions.js)
2. นำไฟล์ไปวางที่ `assets/models/brain.glb`
3. เมื่อรันผ่าน Web Server (เช่น GitHub Pages, Firebase หรือ `http.server`) ตัวแสดงผล [`js/brain/viewer3d.js`](./js/brain/viewer3d.js) จะตรวจพบและโหลดไฟล์ `.glb` ให้อัตโนมัติ
