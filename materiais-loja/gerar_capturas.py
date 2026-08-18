from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = Path(__file__).parent

ITEMS = [
    (
        Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-09b581b9-2e07-4d2b-b8a5-eedbf2b4cc3f.png"),
        "01-scripts.png",
        "Seus scripts,\nsempre à mão",
        "Crie, organize e encontre respostas\nem poucos segundos.",
    ),
    (
        Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-cb9c83b6-5090-4c97-9141-61d7cdeb1006.png"),
        "02-bloco-de-notas.png",
        "Anotações\norganizadas em abas",
        "Busque, formate e salve suas notas\nautomaticamente.",
    ),
    (
        Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-8e174829-3359-42f8-859a-571d5512a41b.png"),
        "03-novo-script.png",
        "Crie scripts\ndo seu jeito",
        "Use categorias, variáveis e observações\npara agilizar o atendimento.",
    ),
    (
        Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-5eb89130-693d-4666-8f7e-1e414d9e1350.png"),
        "04-links-uteis.png",
        "Links úteis\nem um clique",
        "Centralize os sistemas e páginas\nque você mais acessa.",
    ),
    (
        Path(r"C:\Users\ferna\AppData\Local\Temp\codex-clipboard-ecc504b5-1b3f-4767-8e09-f615e08307b3.png"),
        "05-configuracoes.png",
        "Personalize sua\nexperiência",
        "Escolha temas e gerencie segurança,\nlixeira e backup.",
    ),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def create_gradient() -> Image.Image:
    width, height = 1280, 800
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    start = (29, 27, 58)
    middle = (75, 56, 154)
    end = (30, 110, 142)
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
    return image


def rounded_screenshot(source: Image.Image) -> Image.Image:
    target_height = 700
    ratio = target_height / source.height
    target_width = round(source.width * ratio)
    resized = source.convert("RGB").resize((target_width, target_height), Image.Resampling.LANCZOS)
    mask = Image.new("L", resized.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, target_width - 1, target_height - 1), 14, fill=255)
    result = Image.new("RGBA", resized.size)
    result.paste(resized, (0, 0), mask)
    return result


def build(item: tuple[Path, str, str, str]) -> None:
    source_path, filename, title, subtitle = item
    canvas = create_gradient().convert("RGBA")
    screenshot = rounded_screenshot(Image.open(source_path))

    screenshot_x = 78
    screenshot_y = 50
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (
            screenshot_x + 8,
            screenshot_y + 12,
            screenshot_x + screenshot.width + 8,
            screenshot_y + screenshot.height + 12,
        ),
        18,
        fill=(0, 0, 0, 105),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(screenshot, (screenshot_x, screenshot_y))

    draw = ImageDraw.Draw(canvas)
    copy_x = 600
    draw.rounded_rectangle((copy_x, 154, copy_x + 154, 194), 20, fill=(102, 78, 190, 255))
    draw.text((copy_x + 20, 163), "ATENAFLOW", font=font(17, True), fill=(255, 255, 255, 255))
    draw.text((copy_x, 235), title, font=font(54, True), fill=(255, 255, 255, 255), spacing=6)
    draw.text((copy_x, 390), subtitle, font=font(25), fill=(218, 220, 242, 255), spacing=9)

    draw.rounded_rectangle((copy_x, 520, copy_x + 215, 572), 13, fill=(126, 79, 232, 255))
    draw.text((copy_x + 24, 533), "Mais produtividade", font=font(19, True), fill=(255, 255, 255, 255))

    output = canvas.convert("RGB")
    output.save(OUTPUT_DIR / filename, "PNG", optimize=True)


for current_item in ITEMS:
    build(current_item)
