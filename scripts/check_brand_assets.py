from PIL import Image
import os

assets = [
    ("odi-logo-primary.png", r"c:\Odi.Pet\public\brand\logos\primary\odi-logo-primary.png"),
    ("odi-logo-horizontal.png", r"c:\Odi.Pet\public\brand\logos\primary\odi-logo-horizontal.png"),
    ("odi-logo-vertical.png", r"c:\Odi.Pet\public\brand\logos\primary\odi-logo-vertical.png"),
    ("odi-icon-256.png", r"c:\Odi.Pet\public\brand\logos\icon\odi-icon-256.png"),
    ("odi-icon-512.png", r"c:\Odi.Pet\public\brand\logos\icon\odi-icon-512.png"),
    ("splash.png", r"c:\Odi.Pet\public\splash.png"),
    ("icon-512.png", r"c:\Odi.Pet\public\icon-512.png"),
    ("icon-192.png", r"c:\Odi.Pet\public\icon-192.png"),
    ("apple-touch-icon.png", r"c:\Odi.Pet\public\apple-touch-icon.png"),
]

print("=" * 60)
print("OPOS BRAND ASSET VALIDATION REPORT")
print("=" * 60)
for name, path in assets:
    try:
        img = Image.open(path).convert("RGBA")
        print(f"  OK   {name}: {img.size[0]}x{img.size[1]}px | {img.mode}")
    except Exception as e:
        print(f"  FAIL {name}: {e}")
print("=" * 60)
