import sys
from PIL import Image, ImageDraw, ImageFont

MARGIN_PERCENT = 0.05
TOP_MARGIN_PERCENT = 0.05
MAX_HEIGHT_PERCENT = 0.25
OUTLINE_COLOR = (0, 0, 0, 145)
TEXT_COLOR = (255, 255, 255, 255)
DISGUISE_OUTLINE_COLOR = (0, 0, 0, 255)
DISGUISE_TEXT_COLOR = (255, 216, 0, 255)


def get_text_bbox(draw, text, font, spacing=0):
    if "\n" in text:
        return draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing, align="center")
    return draw.textbbox((0, 0), text, font=font)


def get_dynamic_font(draw, text, image_width, image_height, font_path, margin_percent=MARGIN_PERCENT, max_height_percent=MAX_HEIGHT_PERCENT):
    max_text_width = image_width * (1 - 2 * margin_percent)
    max_text_height = image_height * max_height_percent
    font_size = image_height
    min_font_size = 10
    font = None
    spacing = 0

    while font_size >= min_font_size:
        font = ImageFont.truetype(font_path, font_size)
        spacing = int(font_size * 0.04)
        bbox = get_text_bbox(draw, text, font, spacing)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        if text_width <= max_text_width and text_height <= max_text_height:
            outline_width = max(1, int(font_size / 18))
            return font, outline_width, spacing

        font_size -= 1

    return font, 1, spacing


def label_image(image_path, text, font_path):
    with Image.open(image_path) as img:
        img = img.convert("RGBA")
        base_width, base_height = img.size
        draw = ImageDraw.Draw(img)
        font, outline_width, _spacing = get_dynamic_font(draw, text, base_width, base_height, font_path)
        if font is None:
            raise RuntimeError(f"Could not fit text for {image_path}")

        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        x = (base_width - text_width) / 2 - bbox[0]
        y = (base_height * TOP_MARGIN_PERCENT) - bbox[1]

        draw.text(
            (x, y),
            text,
            font=font,
            fill=TEXT_COLOR,
            stroke_width=outline_width,
            stroke_fill=OUTLINE_COLOR,
        )

        img.save(image_path, "WEBP", quality=82, method=5)


def label_centered_yellow_image(image_path, text, font_path):
    with Image.open(image_path) as img:
        img = img.convert("RGBA")
        base_width, base_height = img.size
        draw = ImageDraw.Draw(img)
        font, outline_width, spacing = get_dynamic_font(
            draw,
            text,
            base_width,
            base_height,
            font_path,
            margin_percent=0.08,
            max_height_percent=0.46,
        )
        if font is None:
            raise RuntimeError(f"Could not fit text for {image_path}")

        bbox = get_text_bbox(draw, text, font, spacing)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (base_width - text_width) / 2 - bbox[0]
        y = (base_height - text_height) / 2 - bbox[1]

        draw.multiline_text(
            (x, y),
            text,
            font=font,
            fill=DISGUISE_TEXT_COLOR,
            stroke_width=outline_width,
            stroke_fill=DISGUISE_OUTLINE_COLOR,
            spacing=spacing,
            align="center",
        )

        img.save(image_path, "WEBP", quality=82, method=5)


def main():
    if len(sys.argv) not in (4, 5):
        raise SystemExit("Usage: label-asset.py <image_path> <label> <font_path> [mode]")
    mode = sys.argv[4] if len(sys.argv) == 5 else "map"
    if mode == "center-yellow":
        label_centered_yellow_image(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        label_image(sys.argv[1], sys.argv[2], sys.argv[3])


if __name__ == "__main__":
    main()
