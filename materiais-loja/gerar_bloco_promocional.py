from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = Path(__file__).parent
PROJECT_DIR = BASE_DIR.parent
SOURCE_SCREENSHOT = Path(
    r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-09b581b9-2e07-4d2b-b8a5-eedbf2b4cc3f.png"
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


width, height = 440, 280
canvas = Image.new("RGB", (width, height))
pixels = canvas.load()
start = (28, 25, 57)
middle = (78, 55, 161)
end = (25, 111, 144)
for y in range(height):
    for x in range(width):
        position = (x / width) * 0.78 + (y / height) * 0.22
        if position < 0.58:
            ratio = position / 0.58
            color = tuple(round(start[i] + (middle[i] - start[i]) * ratio) for i in range(3))
        else:
            ratio = (position - 0.58) / 0.42
            color = tuple(round(middle[i] + (end[i] - middle[i]) * ratio) for i in range(3))
        pixels[x, y] = color

canvas = canvas.convert("RGBA")
draw = ImageDraw.Draw(canvas)

# Marca
icon = Image.open(PROJECT_DIR / "public" / "icon.png").convert("RGBA")
icon.thumbnail((36, 36), Image.Resampling.LANCZOS)
canvas.alpha_composite(icon, (27, 25))
draw.text((72, 30), "AtenaFlow", font=font(20, True), fill=(255, 255, 255, 255))

# Mensagem
draw.text((27, 88), "Scripts prontos.\nAtendimento ágil.", font=font(30, True), fill=(255, 255, 255, 255), spacing=3)
draw.text((28, 169), "Organize respostas e use\nem qualquer site.", font=font(15), fill=(220, 221, 242, 255), spacing=4)
draw.rounded_rectangle((27, 226, 218, 258), 16, fill=(119, 77, 226, 255))
draw.text((45, 233), "Organize • Busque • Insira", font=font(13, True), fill=(255, 255, 255, 255))

# Prévia da extensão
source = Image.open(SOURCE_SCREENSHOT).convert("RGB")
preview_height = 238
preview_width = round(source.width * preview_height / source.height)
preview = source.resize((preview_width, preview_height), Image.Resampling.LANCZOS).convert("RGBA")
mask = Image.new("L", preview.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, preview_width - 1, preview_height - 1), 8, fill=255)
preview.putalpha(mask)
preview_x, preview_y = 275, 21

shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    (preview_x + 5, preview_y + 7, preview_x + preview_width + 5, preview_y + preview_height + 7),
    10,
    fill=(0, 0, 0, 120),
)
shadow = shadow.filter(ImageFilter.GaussianBlur(10))
canvas.alpha_composite(shadow)
canvas.alpha_composite(preview, (preview_x, preview_y))

output = canvas.convert("RGB")
output.save(BASE_DIR / "bloco-promocional-440x280.png", "PNG", optimize=True)

