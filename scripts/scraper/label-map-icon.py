import sys
from PIL import Image, ImageDraw, ImageFont

MARGIN_PERCENT = 0.05
TOP_MARGIN_PERCENT = 0.05
MAX_HEIGHT_PERCENT = 0.25
OUTLINE_COLOR = (0, 0, 0, 145)
TEXT_COLOR = (255, 255, 255, 255)


def get_dynamic_font(draw, text, image_width, image_height, font_path):
    max_text_width = image_width * (1 - 2 * MARGIN_PERCENT)
    max_text_height = image_height * MAX_HEIGHT_PERCENT
    font_size = image_height
    min_font_size = 10
    font = None

    while font_size >= min_font_size:
        font = ImageFont.truetype(font_path, font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        if text_width <= max_text_width and text_height <= max_text_height:
            outline_width = max(1, int(font_size / 18))
            return font, outline_width

        font_size -= 1

    return font, 1


def label_image(image_path, text, font_path):
    with Image.open(image_path) as img:
        img = img.convert("RGBA")
        base_width, base_height = img.size
        draw = ImageDraw.Draw(img)
        font, outline_width = get_dynamic_font(draw, text, base_width, base_height, font_path)
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


def main():
    if len(sys.argv) != 4:
        raise SystemExit("Usage: label-map-icon.py <image_path> <label> <font_path>")
    label_image(sys.argv[1], sys.argv[2], sys.argv[3])


if __name__ == "__main__":
    main()
