from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = Path(__file__).parent
PROJECT_DIR = BASE_DIR.parent
SCREENSHOTS = [
    Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-cb9c83b6-5090-4c97-9141-61d7cdeb1006.png"),
    Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-09b581b9-2e07-4d2b-b8a5-eedbf2b4cc3f.png"),
    Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-ecc504b5-1b3f-4767-8e09-f615e08307b3.png"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def gradient(width: int, height: int) -> Image.Image:
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    start = (27, 24, 57)
    middle = (79, 54, 164)
    end = (24, 112, 145)
    for y in range(height):
        for x in range(width):
            position = (x / width) * 0.82 + (y / height) * 0.18
            if position < 0.6:
                ratio = position / 0.6
                color = tuple(round(start[i] + (middle[i] - start[i]) * ratio) for i in range(3))
            else:
                ratio = (position - 0.6) / 0.4
                color = tuple(round(middle[i] + (end[i] - middle[i]) * ratio) for i in range(3))
            pixels[x, y] = color
    return image


def preview(path: Path, target_height: int, radius: int = 13) -> Image.Image:
    source = Image.open(path).convert("RGB")
    target_width = round(source.width * target_height / source.height)
    resized = source.resize((target_width, target_height), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", resized.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, target_width - 1, target_height - 1), radius, fill=255)
    resized.putalpha(mask)
    return resized


canvas = gradient(1400, 560).convert("RGBA")
draw = ImageDraw.Draw(canvas)

# Halo decorativo discreto
halo = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
halo_draw = ImageDraw.Draw(halo)
halo_draw.ellipse((850, -260, 1450, 340), fill=(89, 205, 230, 50))
halo_draw.ellipse((460, 340, 920, 800), fill=(151, 80, 235, 45))
canvas.alpha_composite(halo.filter(ImageFilter.GaussianBlur(60)))

# Marca e mensagem
icon = Image.open(PROJECT_DIR / "public" / "icon.png").convert("RGBA")
icon.thumbnail((58, 58), Image.Resampling.LANCZOS)
canvas.alpha_composite(icon, (82, 64))
draw.text((157, 74), "AtenaFlow", font=font(31, True), fill=(255, 255, 255, 255))

draw.text(
    (82, 165),
    "Respostas rápidas.\nRotina organizada.",
    font=font(58, True),
    fill=(255, 255, 255, 255),
    spacing=5,
)
draw.text(
    (86, 323),
    "Organize scripts, links e anotações em um só lugar.\nEncontre e insira seus textos em poucos segundos.",
    font=font(23),
    fill=(220, 222, 243, 255),
    spacing=7,
)

pills = [("Scripts", 86, 432, 116), ("Links úteis", 216, 432, 142), ("Bloco de notas", 372, 432, 176)]
for label, x, y, pill_width in pills:
    draw.rounded_rectangle((x, y, x + pill_width, y + 42), 21, fill=(105, 77, 205, 255))
    label_box = draw.textbbox((0, 0), label, font=font(16, True))
    label_width = label_box[2] - label_box[0]
    draw.text((x + (pill_width - label_width) / 2, y + 10), label, font=font(16, True), fill=(255, 255, 255, 255))

# Telas sobrepostas
placements = [
    (SCREENSHOTS[0], 390, 735, 92),
    (SCREENSHOTS[2], 405, 1087, 76),
    (SCREENSHOTS[1], 500, 897, 29),
]
for screenshot_path, screenshot_height, x, y in placements:
    shot = preview(screenshot_path, screenshot_height)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (x + 9, y + 13, x + shot.width + 9, y + shot.height + 13),
        16,
        fill=(0, 0, 0, 120),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)))
    canvas.alpha_composite(shot, (x, y))

canvas.convert("RGB").save(BASE_DIR / "bloco-promocional-letreiro-1400x560.png", "PNG", optimize=True)

