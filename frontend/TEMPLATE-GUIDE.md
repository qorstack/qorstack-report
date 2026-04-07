# คู่มือการใช้งาน Template สำหรับ Qorstack Report Service

เอกสารนี้อธิบายวิธีการสร้างและใช้งาน DOCX template สำหรับการสร้าง PDF reports

---

## ภาพรวม

Qorstack Report Service รองรับการสร้าง PDF จาก Word template โดยรองรับ:

- ✅ **Variable Replacement** - แทนที่ตัวแปรด้วยข้อมูลจริง
- ✅ **Tables** - สร้างตารางจากข้อมูล array
- ✅ **Images** - แทรกรูปภาพจาก Base64 หรือ URL
- ✅ **QR Codes** - สร้าง QR Code อัตโนมัติ
- ✅ **Conditional Sections** - แสดง/ซ่อนเนื้อหาตามเงื่อนไข

---

## 1. Simple Variable Replacements

### รูปแบบใน DOCX

```
เรียน คุณ {{customer_name}}

เลขที่ใบแจ้งหนี้: {{invoice_number}}
วันที่: {{invoice_date}}
ยอดรวม: {{total_amount}} บาท
```

### JSON Request

```json
{
    "replace": {
        "customer_name": "สมชาย ใจดี",
        "invoice_number": "INV-2026-001",
        "invoice_date": "25 มกราคม 2569",
        "total_amount": "1,250.00"
    }
}
```

---

## 2. Tables

### รูปแบบที่ 1: ใช้ `{{col:field}}` markers (แนะนำ)

ออกแบบตารางใน Word ได้อิสระ พร้อมใช้ column markers

#### ใน DOCX

| ลำดับ      | ชื่อสินค้า           | จำนวน            | ราคา               |
| ---------- | -------------------- | ---------------- | ------------------ |
| {{col:no}} | {{col:product_name}} | {{col:quantity}} | {{col:unit_price}} |

> **หมายเหตุ:** Row แรกเป็น Header, Row ที่สองเป็น template ที่จะถูก clone

#### JSON Request

```json
{
    "table": [
        {
            "rows": [
                {
                    "no": "1",
                    "product_name": "สินค้า A",
                    "quantity": "2",
                    "unit_price": "500.00"
                },
                {
                    "no": "2",
                    "product_name": "สินค้า B",
                    "quantity": "1",
                    "unit_price": "250.00"
                }
            ],
            "sort": { "unit_price": "desc" },
            "groupBy": ["category"]
        }
    ]
}
```

### รูปแบบที่ 2: แยก Marker Row (สำหรับตารางซับซ้อน)

#### ใน DOCX

```
| หัวข้อ 1 | หัวข้อ 2 | หัวข้อ 3 |
{{table:items}}
| {{col:field1}} | {{col:field2}} | {{col:field3}} |
```

**ข้อดี:**

- Header สามารถออกแบบได้อิสระใน Word
- Marker row บอกจุดเริ่มต้นชัดเจน
- Template row แยกออกมาชัดเจน

---

## 3. Images

### รูปแบบใน DOCX

```
โลโก้บริษัท: {{image:company_logo}}

รูปสินค้า: {{image:product_image}}
```

### JSON Request

```json
{
    "image": {
        "company_logo": {
            "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
            "width": 200,
            "height": 80
        },
        "product_image": {
            "src": "https://example.com/product.jpg",
            "width": 300,
            "height": 200
        }
    }
}
```

### Image Properties

| Property | Type   | Required | Description                      |
| -------- | ------ | -------- | -------------------------------- |
| src      | string | Yes      | Base64 string หรือ URL ของรูปภาพ |
| width    | number | No       | ความกว้าง (pixels)               |
| height   | number | No       | ความสูง (pixels)                 |

---

## 4. QR Codes

### รูปแบบใน DOCX

```
สแกน QR code เพื่อชำระเงิน:
{{qrcode:payment_qr}}

ข้อมูลติดต่อ:
{{qrcode:contact_qr}}
```

### JSON Request

```json
{
    "qrcode": {
        "payment_qr": {
            "text": "https://pay.example.com/invoice/INV-001",
            "size": 150
        },
        "contact_qr": {
            "text": "tel:+66812345678",
            "size": 100
        }
    }
}
```

### QR Code Properties

| Property | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| text     | string | Yes      | ข้อความหรือ URL ที่ต้องการ encode |
| size     | number | No       | ขนาด (pixels), default: 150       |

---

## 5. Barcodes

### รูปแบบใน DOCX

```
รหัสสินค้า:
{{barcode:product_id}}
```

### JSON Request

```json
{
    "barcode": {
        "product_id": {
            "text": "1234567890",
            "format": "Code128",
            "width": 200,
            "height": 50,
            "includeText": true
        }
    }
}
```

### Barcode Properties

| Property | Type   | Required | Description                       |
| -------- | ------ | -------- | --------------------------------- |
| text     | string | Yes      | ข้อมูลที่ต้องการ encode           |
| format   | string | No       | รูปแบบ Barcode (default: Code128) |
| width    | number | No       | ความกว้าง (pixels)                |
| height   | number | No       | ความสูง (pixels)                  |

---

## 6. Conditional Sections

### รูปแบบใน DOCX

```
{{if:show_discount}}
ส่วนลดพิเศษ: {{discount_amount}} บาท

{{if:paid}}
✅ ชำระแล้ว
{{else}}
❌ รอการชำระเงิน

{{if:show_notes}}
หมายเหตุ:
- ชำระภายใน 30 วัน
- ขอบคุณที่ใช้บริการ
```

### JSON Request

```json
{
    "conditions": {
        "show_discount": true,
        "paid": false,
        "show_notes": true
    }
}
```

---

## 7. ตัวอย่างแบบครบถ้วน

### DOCX Template

```
{{image:company_logo}}

ใบแจ้งหนี้เลขที่ {{invoice_number}}

วันที่: {{invoice_date}}
ลูกค้า: {{customer_name}}
ที่อยู่: {{customer_address}}

รายการสินค้า:

| ลำดับ | รายการ | จำนวน | ราคา/หน่วย | รวม |
|-------|--------|--------|-------------|-----|
| {{col:no}} | {{col:description}} | {{col:quantity}} | {{col:unit_price}} | {{col:line_total}} |

รวม: {{subtotal}} บาท
ภาษี: {{tax}} บาท
รวมทั้งสิ้น: {{total}} บาท

{{if:has_discount}}
ส่วนลด: {{discount}} บาท
ยอดสุทธิ: {{final_total}} บาท

{{qrcode:payment_qr}}

{{if:show_footer}}
ขอบคุณที่ใช้บริการ!
```

### JSON Request

```json
{
    "templateId": "550e8400-e29b-41d4-a716-446655440002",
    "fileName": "invoice-001",
    "replace": {
        "invoice_number": "INV-2026-001",
        "invoice_date": "25 มกราคม 2569",
        "customer_name": "บริษัท เอแบค คอร์ปอเรชั่น จำกัด",
        "customer_address": "123 ถนนธุรกิจ แขวงธุรกิจ เขตธุรกิจ กรุงเทพฯ 12345",
        "subtotal": "1,000.00",
        "tax": "100.00",
        "total": "1,100.00",
        "discount": "110.00",
        "final_total": "990.00"
    },
    "table": [
        {
            "rows": [
                {
                    "no": "1",
                    "description": "บริการให้คำปรึกษา",
                    "quantity": "10",
                    "unit_price": "100.00",
                    "line_total": "1,000.00"
                }
            ]
        }
    ],
    "image": {
        "company_logo": {
            "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
            "width": 200,
            "height": 80
        }
    },
    "qrcode": {
        "payment_qr": {
            "text": "https://payment.example.com/pay/INV-2026-001",
            "size": 150
        }
    },
    "conditions": {
        "has_discount": true,
        "show_footer": true
    }
}
```

---

## ไวยากรณ์สรุป

| ประเภท        | Syntax                 | ตัวอย่าง               |
| ------------- | ---------------------- | ---------------------- |
| ตัวแปรธรรมดา  | `{{variable_name}}`    | `{{customer_name}}`    |
| Table Marker  | `{{table:table_name}}` | `{{table:items}}`      |
| Column Marker | `{{col:field_name}}`   | `{{col:product_name}}` |
| รูปภาพ        | `{{image:image_name}}` | `{{image:logo}}`       |
| QR Code       | `{{qrcode:qr_name}}`   | `{{qrcode:payment}}`   |
| Barcode       | `{{barcode:bar_name}}` | `{{barcode:product}}`  |
| เงื่อนไข      | `{{if:condition}}`     | `{{if:show_discount}}` |
| เงื่อนไข else | `{{else}}`             | `{{else}}`             |

---

