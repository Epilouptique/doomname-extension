"""Génère les images promotionnelles du Chrome Web Store.
440x280 (petite tuile) et 1400x560 (bandeau haut de page), PNG 24 bits sans alpha.
  python3 build/make-promo.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON = os.path.join(ROOT, 'icons', 'icon-512.png')
OUT = os.path.join(ROOT, 'docs', 'store')

BG = (249, 249, 248)
TEXT = (26, 26, 24)
MUTED = (107, 107, 103)
ACCENT = (217, 119, 87)
SUCCESS = (29, 158, 117)

FONT_DIR = '/usr/share/fonts/truetype/dejavu'


def font(size, bold=False):
    path = os.path.join(FONT_DIR, 'DejaVuSans%s.ttf' % ('-Bold' if bold else ''))
    return ImageFont.truetype(path, size) if os.path.exists(path) else ImageFont.load_default()


def compose(w, h, icon_px, title_px, sub_px, gap, out_name, subtitle):
    """Icône à gauche, texte à droite, le bloc entier centré."""
    canvas = Image.new('RGB', (w, h), BG)
    d = ImageDraw.Draw(canvas)

    icon = Image.open(ICON).convert('RGBA').resize((icon_px, icon_px), Image.LANCZOS)

    f_title, f_sub = font(title_px, True), font(sub_px)
    title = 'DoomName'
    tw = d.textlength(title, font=f_title)
    sw = max(d.textlength(line, font=f_sub) for line in subtitle)

    block_w = icon_px + gap + max(tw, sw)
    x = (w - block_w) / 2
    text_x = x + icon_px + gap

    text_h = title_px + 10 + len(subtitle) * (sub_px + 8)
    canvas.paste(icon, (int(x), int((h - icon_px) / 2)), icon)

    y = (h - text_h) / 2
    d.text((text_x, y), title, font=f_title, fill=TEXT)
    y += title_px + 14
    for line in subtitle:
        d.text((text_x, y), line, font=f_sub, fill=MUTED)
        y += sub_px + 8

    # Filet accent sous le bloc texte, rappel de l'identité du site
    d.rounded_rectangle([text_x, y + 6, text_x + 54, y + 11], radius=3, fill=ACCENT)

    path = os.path.join(OUT, out_name)
    canvas.save(path, 'PNG')  # RGB : aucun canal alpha
    print(f'{path}  {w}x{h}')


def main():
    os.makedirs(OUT, exist_ok=True)
    compose(440, 280, 108, 34, 16, 22, 'promo-440x280.png',
            ['Surveillez vos noms', 'de domaine en un clic'])
    compose(1400, 560, 230, 76, 34, 52, 'promo-1400x560.png',
            ['Vérifiez un nom de domaine et soyez alerté', 'dès qu’il se libère'])


if __name__ == '__main__':
    main()
