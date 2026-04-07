# คู่มือการใช้งาน Render Endpoints

เอกสารนี้อธิบายรายละเอียดของ Endpoints สำหรับการสร้างไฟล์ PDF (`/render`) รวมถึงพารามิเตอร์ต่างๆ ที่รองรับและรูปแบบของ Response ที่ได้รับ

## ภาพรวม (Overview)

API กลุ่ม Render ใช้สำหรับแปลงเอกสาร Template (DOCX) ให้เป็น PDF โดยรองรับการแทนที่ข้อมูลต่างๆ เช่น ข้อความ, ตาราง, รูปภาพ, QR Code, Barcode และเงื่อนไขการแสดงผล

**Base URL**: `/api/render` (ขึ้นอยู่กับการตั้งค่า Base Path ของ Server)
**Authentication**: Required (ต้องแนบ Token)

---

## 1. สร้าง PDF จาก Template ที่บันทึกไว้

ใช้สำหรับสร้าง PDF จาก Template ที่ถูกอัปโหลดไว้ในระบบแล้ว โดยอ้างอิงผ่าน `templateKey`

**Endpoint**: `POST /render/template-pdf`

### Request Body

```json
{
    "templateKey": "my-invoice-template",
    "fileName": "invoice-101",
    "replace": {
        "customer_name": "John Doe",
        "invoice_date": "2023-10-25"
    },
    "table": {
        "items": {
            "rows": [
                { "desc": "Item A", "qty": 1, "price": 100 },
                { "desc": "Item B", "qty": 2, "price": 50 }
            ]
        }
    },
    "image": {
        "logo": {
            "src": "https://example.com/logo.png",
            "width": 100,
            "height": 50
        }
    },
    "condition": {
        "show_vat": true,
        "show_discount": false
    }
}
```

### คำอธิบายพารามิเตอร์ (Parameters)

| Parameter     | Type   | Required | Description                                                                     |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `templateKey` | string | **Yes**  | Key ของ Template ที่ต้องการใช้งาน                                               |
| `fileName`    | string | No       | ชื่อไฟล์ PDF ที่ต้องการ (ไม่ต้องใส่นามสกุล .pdf) หากไม่ระบุระบบจะสร้าง UUID ให้ |
| `replace`     | object | No       | ข้อมูลสำหรับแทนที่ข้อความธรรมดา (ดูรายละเอียดด้านล่าง)                          |
| `table`       | object | No       | ข้อมูลสำหรับแทนที่ตาราง (ดูรายละเอียดด้านล่าง)                                  |
| `image`       | object | No       | ข้อมูลสำหรับแทนที่รูปภาพ (ดูรายละเอียดด้านล่าง)                                 |
| `qrcode`      | object | No       | ข้อมูลสำหรับสร้าง QR Code (ดูรายละเอียดด้านล่าง)                                |
| `barcode`     | object | No       | ข้อมูลสำหรับสร้าง Barcode (ดูรายละเอียดด้านล่าง)                                |
| `condition`   | object | No       | ข้อมูลสำหรับเงื่อนไขการแสดงผล (ดูรายละเอียดด้านล่าง)                            |

---

## 2. สร้าง PDF จากไฟล์ DOCX (Base64)

ใช้สำหรับสร้าง PDF โดยการส่งไฟล์ DOCX เข้ามาโดยตรงในรูปแบบ Base64 string

**Endpoint**: `POST /render/docx-pdf`

### Request Body

```json
{
    "fileBase64": "UEsDBBQAAAAIAAAAIQ...",
    "fileName": "my-document",
    "replace": {
        "variable1": "value1"
    }
    // ... (รองรับ replace, table, image, etc. เหมือนกัน)
}
```

### คำอธิบายพารามิเตอร์ (Parameters)

| Parameter       | Type     | Required | Description                                                                    |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------ |
| `fileBase64`    | string   | **Yes**  | เนื้อหาไฟล์ DOCX ที่แปลงเป็น Base64 string                                     |
| `fileName`      | string   | No       | ชื่อไฟล์ PDF ที่ต้องการ                                                        |
| _Common Params_ | _object_ | _No_     | รองรับ `replace`, `table`, `image`, `qrcode`, `barcode`, `condition` เหมือนกัน |

---

## 3. Response Structure

ทั้งสอง Endpoints จะคืนค่ากลับมาในรูปแบบเดียวกันเมื่อประมวลผลสำเร็จ

### Success Response (200 OK)

```json
{
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "downloadUrl": "https://minio.example.com/reports/temp-download/...",
    "expiresIn": 3600,
    "status": "success"
}
```

| Field         | Type   | Description                                |
| ------------- | ------ | ------------------------------------------ |
| `jobId`       | UUID   | รหัสอ้างอิงของงาน (Job ID)                 |
| `downloadUrl` | string | ลิงก์สำหรับดาวน์โหลดไฟล์ PDF (มีอายุจำกัด) |
| `expiresIn`   | int    | เวลาที่ลิงก์จะหมดอายุ (หน่วยวินาที)        |
| `status`      | string | สถานะการทำงาน (ปกติจะเป็น "success")       |

---

## 4. รายละเอียดตัวแปรต่างๆ (Detailed Object Structures)

### Replace Object (`replace`)

ใช้แทนที่ข้อความใน Template ที่อยู่ในรูปแบบ `{{key}}`

```json
"replace": {
  "name": "John Doe",
  "date": "25/10/2023"
}
```

### Table Object (`table`)

ใช้แทนที่ข้อมูลในตาราง สำหรับ Template ที่มี `{{table:key}}`

```json
"table": {
  "invoiceItems": {
    "rows": [
      { "item": "A", "price": 100 },
      { "item": "B", "price": 200 }
    ]
  }
}
```

- `rows`: List ของ Object ที่ Key ตรงกับชื่อตัวแปรในตาราง

### Image Object (`image`)

ใช้แทนที่รูปภาพ สำหรับ Template ที่มี `{{image:key}}`

```json
"image": {
  "headerLogo": {
    "src": "https://example.com/logo.png",
    "width": 200,
    "height": 100,
    "fit": "contain"
  }
}
```

- `src` (Required): URL ของรูปภาพ หรือ Base64 string
- `width` (Optional): ความกว้าง (pixels)
- `height` (Optional): ความสูง (pixels)
- `fit` (Optional): การจัดวางรูปภาพ (เช่น "contain", "cover", "fill")

### QR Code Object (`qrcode`)

ใช้สร้าง QR Code สำหรับ Template ที่มี `{{qr:key}}`

```json
"qrcode": {
  "websiteQr": {
    "text": "https://www.example.com",
    "size": 150,
    "color": "#000000",
    "backgroundColor": "#FFFFFF",
    "logo": "https://example.com/icon.png"
  }
}
```

- `text` (Required): ข้อความหรือ URL ที่ต้องการสร้าง QR Code
- `size` (Optional): ขนาด (default: 120)
- `color` (Optional): สี QR Code (default: black)
- `backgroundColor` (Optional): สีพื้นหลัง
- `logo` (Optional): URL ของรูปโลโก้ตรงกลาง QR Code

### Barcode Object (`barcode`)

ใช้สร้าง Barcode สำหรับ Template ที่มี `{{barcode:key}}`

```json
"barcode": {
  "productId": {
    "text": "123456789",
    "format": "Code128",
    "width": 300,
    "height": 100,
    "includeText": true
  }
}
```

- `text` (Required): ข้อมูล Barcode
- `format` (Optional): รูปแบบ Barcode (default: "Code128")
- `width` (Optional): ความกว้าง (default: 300)
- `height` (Optional): ความสูง (default: 100)
- `includeText` (Optional): แสดงตัวเลขใต้ Barcode หรือไม่ (default: true)
- `color` (Optional): สี Barcode (default: "#000000")
- `backgroundColor` (Optional): สีพื้นหลัง (default: "#FFFFFF")

### Condition Object (`condition`)

ใช้ควบคุมการแสดงผลของ Section ใน Template ที่อยู่ในรูปแบบ `{{if:key}} ... {{/if:key}}`

```json
"condition": {
  "hasDiscount": true,
  "showFooter": false
}
```

- `true`: แสดงส่วนนั้น
- `false`: ซ่อนส่วนนั้น
