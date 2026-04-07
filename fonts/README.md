# Fonts

Place `.ttf` or `.otf` font files in this folder to make them available in your templates.

The backend syncs this folder automatically on every startup — no container rebuild required.

---

## How it works

1. Add font files to this folder
2. Restart the backend container: `docker compose restart backend`
3. The fonts appear in your project's font library within seconds

---

## Recommended Thai fonts

| Font | Source |
| --- | --- |
| TH Sarabun New | [f0nt.com](https://www.f0nt.com/release/th-sarabun-new/) |
| Sarabun | [Google Fonts](https://fonts.google.com/specimen/Sarabun) |
| Noto Sans Thai | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Thai) |

Download and drop the `.ttf` files directly into this folder.

---

## Pre-installed fonts

The following fonts are already available without any files here:

- TH Sarabun New
- THSarabunNew
- Angsana New / AngsanaUPC
- Cordia New / CordiaUPC
- Browallia New / BrowalliaUPC

---

## Notes

- Supported formats: `.ttf`, `.otf`
- Font filenames become the font family name in templates
- Use the same font files as your Word/Excel templates to ensure identical rendering
