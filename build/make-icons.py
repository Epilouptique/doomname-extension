"""Exporte les icônes PNG de la barre d'outils depuis assets/doomname-icon.svg.
Rendu Chrome headless en 1024 px puis réduction LANCZOS (netteté en 16 px).
  python3 build/make-icons.py
"""
import os
import re
import shutil
import subprocess
import tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, 'assets', 'doomname-icon.svg')
SIZES = (16, 32, 48, 128, 256, 512)
MASTER = 1024

CHROME = next(
    (c for c in ('google-chrome', 'chromium', 'chromium-browser', 'chrome')
     if shutil.which(c)),
    None,
)


def render_master(path, tmpdir):
    if not CHROME:
        raise SystemExit("Chrome/Chromium introuvable : impossible de rasteriser le SVG.")

    # Le SVG source déclare width/height=500 : Chrome le dessinerait à 500 px
    # dans une fenêtre de 1024. On force les dimensions du rendu maître.
    svg = open(SVG, encoding='utf-8').read()
    svg = re.sub(r'width="\d+(\.\d+)?"', f'width="{MASTER}"', svg, count=1)
    svg = re.sub(r'height="\d+(\.\d+)?"', f'height="{MASTER}"', svg, count=1)
    scaled = os.path.join(tmpdir, 'master.svg')
    open(scaled, 'w', encoding='utf-8').write(svg)

    subprocess.run([
        CHROME, '--headless', '--disable-gpu', '--no-sandbox',
        f'--window-size={MASTER},{MASTER}',
        '--default-background-color=00000000',
        '--virtual-time-budget=2000',
        f'--screenshot={path}',
        f'file://{scaled}',
    ], check=True, capture_output=True)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        master_path = os.path.join(tmp, 'master.png')
        render_master(master_path, tmp)
        master = Image.open(master_path).convert('RGBA')
        for size in SIZES:
            out = os.path.join(ROOT, 'icons', f'icon-{size}.png')
            master.resize((size, size), Image.LANCZOS).save(out)
            print(out)


if __name__ == '__main__':
    main()
