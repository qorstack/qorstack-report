# Qorstack Report Service

ระบบสร้างรายงาน PDF จากเทมเพลต DOCX/DOC และข้อมูลแบบไดนามิก

## ภาพรวม

Qorstack Report Service เป็น REST API ที่ช่วยในการสร้างเอกสาร PDF จากไฟล์เทมเพลต DOCX/DOC โดยรองรับการแทนที่ตัวแปรต่างๆ รวมถึงตาราง รูปภาพ QR Code และเงื่อนไขแบบไดนามิก

## การติดตั้งและการตั้งค่า

ดูรายละเอียดใน [PROJECT-SETUP.md](setup-docs/PROJECT-SETUP.md)

## API Endpoints

### Template-based PDF Generation

- `POST /render/template-pdf/file` - สร้าง PDF จากเทมเพลตที่เก็บไว้ และส่งไฟล์กลับ
- `POST /render/template-pdf/link` - สร้าง PDF จากเทมเพลตที่เก็บไว้ และส่งลิงก์ดาวน์โหลดกลับ

### DOCX File-based PDF Generation

- `POST /render/docx-pdf/file` - สร้าง PDF จากไฟล์ DOCX ที่ส่งมา และส่งไฟล์กลับ
- `POST /render/docx-pdf/link` - สร้าง PDF จากไฟล์ DOCX ที่ส่งมา และส่งลิงก์ดาวน์โหลดกลับ

### Job Management

- `GET /render/jobs` - ดูรายการงานทั้งหมดพร้อม pagination
- `GET /render/jobs/{id}` - ดูรายละเอียดงานตาม ID

## การใช้งานตัวแปรในไฟล์ DOCX

ระบบรองรับการแทนที่ตัวแปรหลายประเภทในไฟล์ DOCX:

### 1. Simple Variable Replacements

ใช้ `{{variable_name}}` ในไฟล์ DOCX:

```
เรียน คุณ{{customer_name}}
เลขที่ใบแจ้งหนี้: {{invoice_number}}
วันที่: {{invoice_date}}
```

ส่งข้อมูลใน JSON:

```json
{
    "replace": {
        "customer_name": "สมชาย ใจดี",
        "invoice_number": "INV-2026-001",
        "invoice_date": "23 มกราคม 2569"
    }
}
```

### 2. Table Data

ระบบใช้การจับคู่ลำดับตาราง (Index-based mapping) โดยไม่ต้องระบุชื่อตาราง `{{table:name}}`
เพียงใส่ตัวแปรในแถวของตารางที่ต้องการให้เป็นเทมเพลต:

**ในไฟล์ DOCX:**

| ชื่อสินค้า | จำนวน | ราคา |
|------------|--------|-------|
| {{product_name}} | {{quantity}} | {{price}} |

**ส่งข้อมูลใน JSON:**

```json
{
    "tables": [
        [
            {
                "product_name": "สินค้า A",
                "quantity": "2",
                "price": "100.00"
            },
            {
                "product_name": "สินค้า B",
                "quantity": "1",
                "price": "50.00"
            }
        ],
        [
             {
                 "other_col": "..."
             }
        ]
    ]
}
```

หมายเหตุ: ข้อมูลใน `tables` จะถูกนำไปใส่ในตารางที่พบในเอกสารตามลำดับ (ตารางแรกในเอกสารใช้ข้อมูล index 0, ตารางที่สองใช้ index 1, ฯลฯ)

### 3. Images

ใช้ `{{image:image_name}}` (หากอยู่ใน Textbox จะปรับขนาดตาม Textbox อัตโนมัติ):

```
โลโก้บริษัท:
{{image:company_logo}}
```

ส่งข้อมูลใน JSON:

```json
{
    "image": {
        "company_logo": {
            "src": "http://example.com/logo.png",
            "width": 200,
            "height": 80,
            "objectFit": "cover"
        }
    }
}
```

### 4. QR Codes & Barcodes

ใช้ `{{qr:qr_name}}` หรือ `{{barcode:barcode_name}}`:

```
สแกน QR code:
{{qr:payment_qr}}

Barcode:
{{barcode:product_code}}
```

ส่งข้อมูลใน JSON:

```json
{
    "qrCode": {
        "payment_qr": {
            "text": "https://example.com/pay",
            "size": 150
        }
    },
    "barcode": {
        "product_code": {
            "text": "123456789",
            "format": "Code128",
            "width": 300,
            "height": 100
        }
    }
}
```

### 5. Conditional Sections

*ยกเลิกการรองรับ Conditional Sections ในเวอร์ชันนี้*

## ตัวอย่างการใช้งานแบบครบถ้วน

ดูรายละเอียดและตัวอย่างครบถ้วนใน [DOCX Variable Usage Guide](.cursor/plans/docx-variable-usage-guide.plan.md)

## การทดสอบ

### ใช้ Postman

1. สร้าง request POST
2. URL: `https://your-api/render/docx-pdf/file`
3. Headers: `Content-Type: application/json`, `Authorization: Bearer <token>`
4. Body: JSON ตามรูปแบบข้างต้น

### ใช้ curl

```bash
curl -X POST "https://your-api/render/docx-pdf/file" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d @request.json \
  --output result.pdf
```

## การพัฒนา

### Prerequisites

- .NET 8.0+
- Docker (สำหรับฐานข้อมูล)
- Git

### การรันโปรเจค

```bash
# Clone repository
git clone <repository-url>
cd qorstack-report-service

# Setup environment
./env-pull.sh
./gen-db.sh

# Run the application
dotnet run --project src/Web/Web.csproj
```

## เอกสารเพิ่มเติม

- [Project Setup](setup-docs/PROJECT-SETUP.md)
- [Database Setup](setup-docs/GEN-DB.md)
- [Security Setup](setup-docs/SECURITY-SETUP.md)
- [DOCX Variable Usage Guide](.cursor/plans/docx-variable-usage-guide.plan.md)

## License

[License information]
