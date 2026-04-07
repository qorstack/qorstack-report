#!/bin/bash

# --- Configuration ---
TARGET_DIR="./fonts"           # โฟลเดอร์ที่จะเอาฟอนต์ไปใช้จริง (Mount เข้า Docker)
REPO_DIR="./.google-fonts-repo" # โฟลเดอร์ซ่อนสำหรับเก็บ Git Repo (เอาไว้ Pull อัปเดต)
REPO_URL="https://github.com/google/fonts.git"

# --- Setup ---
mkdir -p "$TARGET_DIR"

echo "========================================"
echo "   🚀 Syncing ALL Google Fonts"
echo "   Target: $TARGET_DIR"
echo "========================================"

# 1. ตรวจสอบ Git
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git first."
    exit 1
fi

# 2. จัดการ Repository (Clone หรือ Pull)
if [ -d "$REPO_DIR/.git" ]; then
    echo "🔄 Updating existing repository (fetching new fonts)..."
    cd "$REPO_DIR"
    # ดึงเฉพาะส่วนต่างที่อัปเดต
    git pull --depth=1
    cd ..
else
    echo "⬇️  Cloning entire repository..."
    echo "    (Warning: This is >1GB data. Grab a coffee! ☕)"
    # Clone แบบ depth=1 เพื่อไม่เอา history (ประหยัดพื้นที่และเวลา)
    git clone --depth=1 "$REPO_URL" "$REPO_DIR"
fi

# 3. คัดลอกไฟล์ฟอนต์ไปยัง ./fonts
echo "📂 Extracting font files (.ttf / .otf) to $TARGET_DIR..."

# ใช้คำสั่ง find เพื่อค้นหาไฟล์ฟอนต์ในโฟลเดอร์ใบอนุญาตต่างๆ (ofl, apache, ufl)
# และ copy ไปยังเป้าหมาย
# -u : Update (copy เฉพาะไฟล์ที่ใหม่กว่าหรือยังไม่มี)
# -v : Verbose (โชว์ชื่อไฟล์ที่ก๊อป)

find "$REPO_DIR/ofl" "$REPO_DIR/apache" "$REPO_DIR/ufl" \
    -type f \( -name "*.ttf" -o -name "*.otf" \) \
    -exec cp -u {} "$TARGET_DIR" \;

# นับจำนวนไฟล์
COUNT=$(ls -1 "$TARGET_DIR" | wc -l)

echo "========================================"
echo "   ✅ Sync Complete!"
echo "   🎉 Total fonts in $TARGET_DIR: $COUNT files"
echo "========================================"
