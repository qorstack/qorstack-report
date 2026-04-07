# คู่มือการตั้งค่าและการ Publish Qorstack Report SDK

เอกสารนี้รวบรวมขั้นตอนการจัดการโปรเจกต์ การตั้งค่า และวิธีการนำ SDK ขึ้น Public ทั้ง NPM และ NuGet

## 1. โครงสร้างและการจัดการ Config

เราได้ตั้งค่าให้ **`package.json` เป็นศูนย์กลางข้อมูล (Single Source of Truth)** ดังนั้นคุณแก้ไขค่าต่างๆ ที่นี่ที่เดียว แล้วระบบจะ Sync ไปยัง .NET ให้เอง

### ไฟล์สำคัญ

- **`package.json`**: ไฟล์หลักสำหรับเก็บ Version, Description, Authors, License และ Script ต่างๆ
- **`src/qorstack-swagger.json`**: ไฟล์ Swagger/OpenAPI ต้นฉบับ (ย้ายมาไว้ที่นี่แล้ว)
- **`scripts/sync-config.js`**: Script ที่ช่วย copy ค่าจาก `package.json` ไปใส่ใน `.csproj`

### วิธีการอัปเดต Config

เมื่อต้องการเปลี่ยน Version หรือแก้ไขรายละเอียดโปรเจกต์:

1. เปิดไฟล์ `package.json`
2. แก้ไขค่าที่ต้องการ เช่น:

   ```json
   {
     "version": "1.0.1",
     "description": "คำอธิบายใหม่...",
     "author": "Qorstack Team"
   }
   ```

3. รันคำสั่ง Build (ระบบจะ Sync ให้เองก่อน Build):

   ```bash
   yarn build
   ```

   _(หรือ `npm run build`)_

---

## 2. การจัดการ NPM (Node.js)

### การเตรียม Account

1. สมัครสมาชิกที่ [npmjs.com](https://www.npmjs.com/)
2. ยืนยัน Email ให้เรียบร้อย
3. Login ในเครื่องผ่าน Terminal:

   ```bash
   npm login
   ```

   (ใส่ Username, Password, Email ตามขั้นตอน)

   ```bash
   npm config set //registry.npmjs.org/:_authToken=[YOUR_TOKEN_HERE]
   ```

   (ใส่ Token ที่ได้จาก npmjs.com)

### ขั้นตอนการ Publish

1. **ตรวจสอบความพร้อม:**
   - อัปเดต Version ใน `package.json` (ห้ามซ้ำกับของเดิม)
   - รัน `yarn build` เพื่อตรวจสอบความถูกต้องและ Sync Config
2. **Publish:** - **แบบปกติ (Stable Release):**
   `npm publish --access public
      ` - **แบบ Beta (Test Release):** - ตั้ง Version ใน `package.json` เป็นแบบมี suffix เช่น `1.0.0-beta.0` - รันคำสั่ง:
   `npm publish --access public --tag beta
` - (ผู้ใช้ต้อง install ด้วย `@beta` เพื่อใช้งาน version นี้)\_

---

## 3. การจัดการ NuGet (.NET)

### การเตรียม Account

1. สมัครสมาชิกที่ [nuget.org](https://www.nuget.org/)
2. ไปที่ **API Keys** > **Create**
3. ตั้งชื่อ Key และเลือก Scope เป็น **Push**
4. Copy API Key เก็บไว้ (จะเห็นได้แค่ครั้งเดียว)

### ขั้นตอนการ Publish

1. **Pack (สร้างไฟล์ .nupkg):**
   หลังจากรัน `yarn build` (ซึ่งจะ Sync version ไปที่ .csproj แล้ว) ให้รันคำสั่งนี้เพื่อสร้าง package:

   ```bash
   dotnet pack src/dotnet/Qorstack.Report.Sdk.csproj -c Release
   ```

   _ไฟล์ที่ได้จะอยู่ที่ `src/dotnet/bin/Release/Qorstack.Report.Sdk.<version>.nupkg`_

2. **Push (อัปโหลดขึ้น Server):**
   แทนที่ `<YOUR_API_KEY>` ด้วย Key ที่ได้จากเว็บ:

   ```bash
   dotnet nuget push src/dotnet/bin/Release/*.nupkg --api-key <YOUR_API_KEY> --source https://api.nuget.org/v3/index.json
   ```

---

## 4. Workflow การอัปเดต SDK (สรุปจบ)

เมื่อมีการแก้ไข Code หรือ Swagger ใหม่:

1. **แก้ไข Code/Swagger:**
   - ถ้าแก้ Swagger: อัปเดตไฟล์ `src/qorstack-swagger.json`
   - Gen Code ใหม่: `yarn gen:all`
2. **อัปเดต Version:**
   - แก้ `version` ใน `package.json`
3. **Build & Sync:**
   - รัน `yarn build`
   - (เช็คว่าไฟล์ใน `dist/` และ `src/dotnet/bin/` ถูกสร้างใหม่ถูกต้อง)
4. **Publish NPM:**
   - `npm publish --access public`
5. **Publish NuGet:**
   - `dotnet pack src/dotnet/Qorstack.Report.Sdk.csproj -c Release`
   - `dotnet nuget push ...`

---

## หมายเหตุเพิ่มเติม

- **การ Test ใช้งานก่อน Public:**
  - **NPM:** ใช้คำสั่ง `npm pack` จะได้ไฟล์ `.tgz` ส่งให้คนอื่น install ได้ด้วย `npm install ./path/to/file.tgz`
  - **NuGet:** ตั้งค่า NuGet Source ใน Visual Studio ให้ชี้มาที่โฟลเดอร์ในเครื่อง แล้วเอาไฟล์ `.nupkg` ไปวางเพื่อ test install
