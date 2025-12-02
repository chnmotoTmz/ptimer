from PIL import Image, ImageDraw

def create_icon(size=(64, 64), primary_color='blue', background_color='white'):
    """
    Generates a simple icon for the system tray.
    """
    image = Image.new('RGB', size, background_color)
    draw = ImageDraw.Draw(image)

    # Draw a simple "R" for "Recording"
    draw.text((18, 10), "R", fill=primary_color, font_size=40)

    image.save('icon.png')

if __name__ == '__main__':
    create_icon()
