import re, shutil

svg_path = 'public/brand/logos/splash/odi-splash-logo.svg'
shutil.copy(svg_path, svg_path + '.bak')

with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

original_size = len(content)

# Background path: fill-rule="evenodd" class="a" - tum ekrani kaplayan buyuk path
# Bu path'i bul ve kaldir
pattern = r'<path fill-rule="evenodd" class="a" d="m1523\.8-18\.2l-7\.2 1962-1961\.9-7\.2 7\.1-1962z"/>'
content_new = re.sub(pattern, '', content)

if content_new == content:
    # Alternatif: class a olan tum fill-rule=evenodd path'leri dene
    print('Spesifik pattern bulunamadi, genel arama yapiliyor...')
    # SVG icerigini goster
    print(content[:500])
else:
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(content_new)
    print('BASARILI: background path kaldirildi')
    print('Eski boyut: ' + str(original_size) + ' byte')
    print('Yeni boyut: ' + str(len(content_new)) + ' byte')
    remaining = re.findall(r'class="a"', content_new)
    print('Kalan class=a sayisi: ' + str(len(remaining)))
