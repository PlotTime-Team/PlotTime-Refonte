#!/usr/bin/env python3
"""Génère le feature graphic Google Play (1024x500) de PlotTime.

Usage : python3 mobile/scripts/feature-graphic.py
Dépendance : Pillow (`pip install Pillow`). Utilise la police Mulish déjà
présente dans node_modules et l'icône de branding. Sortie :
mobile/assets/branding/feature-graphic-1024x500.png
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
MOBILE = os.path.dirname(HERE)
FONTS = os.path.join(MOBILE, "node_modules/@expo-google-fonts/mulish")
ICON = os.path.join(MOBILE, "assets/branding/icon-google-play-512.png")
OUT = os.path.join(MOBILE, "assets/branding/feature-graphic-1024x500.png")

W, H = 1024, 500

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# --- fond : dégradé vertical (bleu profond du logo -> indigo) ---
top, bot = (11, 7, 90), (42, 28, 138)   # #0B075A -> #2A1C8A
bg = Image.new("RGB", (W, H))
d = ImageDraw.Draw(bg)
for y in range(H):
    d.line([(0, y), (W, y)], fill=lerp(top, bot, y / H))
bg = bg.convert("RGBA")

# --- halo lumineux derrière l'icône ---
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([5, 20, 465, 480], fill=(91, 75, 224, 120))  # #5B4BE0
bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(70)))

# --- icône : redimensionnée, coins arrondis, ombre douce ---
IS = 300
ic = Image.open(ICON).convert("RGBA").resize((IS, IS), Image.LANCZOS)
mask = Image.new("L", (IS, IS), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, IS, IS], radius=int(IS * 0.22), fill=255)
ix, iy = 85, (H - IS) // 2
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [ix + 6, iy + 14, ix + IS + 6, iy + IS + 14], radius=int(IS * 0.22), fill=(0, 0, 0, 110))
bg = Image.alpha_composite(bg, shadow.filter(ImageFilter.GaussianBlur(22)))
bg.paste(ic, (ix, iy), mask)

draw = ImageDraw.Draw(bg)
tx = ix + IS + 62
avail = W - tx - 56

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

# wordmark auto-ajusté
wm_size = 128
while wm_size > 60:
    f_wm = font("800ExtraBold/Mulish_800ExtraBold.ttf", wm_size)
    if draw.textlength("PlotTime", font=f_wm) <= avail:
        break
    wm_size -= 2

tagline = "Séries · Animés · Films · Jeux"
subline = "Suivez tout ce que vous regardez et jouez."

def fit(path, text, start, floor=14):
    s = start
    while s > floor:
        f = font(path, s)
        if draw.textlength(text, font=f) <= avail:
            return f
        s -= 1
    return font(path, floor)

f_tag = fit("600SemiBold/Mulish_600SemiBold.ttf", tagline, 38)
f_sub = fit("500Medium/Mulish_500Medium.ttf", subline, 28)

def th(f, t):
    b = draw.textbbox((0, 0), t, font=f)
    return b[3] - b[1]

wm_bb = draw.textbbox((0, 0), "PlotTime", font=f_wm)
wm_h = wm_bb[3] - wm_bb[1]
gap1, gap2, bar_gap, bar_h = 24, 18, 22, 6
block_h = wm_h + bar_gap + bar_h + gap1 + th(f_tag, tagline) + gap2 + th(f_sub, subline)
y = (H - block_h) // 2 - 6

draw.text((tx, y - wm_bb[1]), "PlotTime", font=f_wm, fill=(255, 255, 255))
y += wm_h + bar_gap
draw.rounded_rectangle([tx, y, tx + 120, y + bar_h], radius=3, fill=(122, 108, 255))
y += bar_h + gap1
tb = draw.textbbox((0, 0), tagline, font=f_tag)
draw.text((tx, y - tb[1]), tagline, font=f_tag, fill=(201, 195, 255))
y += th(f_tag, tagline) + gap2
sb = draw.textbbox((0, 0), subline, font=f_sub)
draw.text((tx, y - sb[1]), subline, font=f_sub, fill=(150, 142, 220))

bg.convert("RGB").save(OUT, "PNG")
print("OK ->", OUT)
