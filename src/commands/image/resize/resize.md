# image resize

Create resized copies of an image. Each copy is written next to the original as `<name>--<size>px.<ext>`, and its longest side is set to `<size>` pixels with the aspect ratio kept. The original is never changed.

## Usage

```bash
hlpr image resize -path <image> -size <px>
hlpr image resize -path <image> --all
hlpr image resize -path <image> --favicon
```

### Arguments

- `-path <image>` - Path to the image file
- `-size <px>` - Length of the longest side in pixels (positive whole number)
- `--all` - Create one copy for each popular width that is smaller than the image
- `--favicon` - Create one `favicon.ico` file next to the image, holding 16, 32, 48, 64, 128, and 256 px icons (only sizes smaller than the image)

Use only one of `-size`, `--all`, or `--favicon`.

## Examples

```bash
# photo.jpg -> photo--256px.jpg
hlpr image resize -path photo.jpg -size 256

# icons/logo.png -> icons/logo--64px.png
hlpr image resize -path icons/logo.png -size 64

# photo.jpg -> photo--16px.jpg, photo--32px.jpg, ... for every popular width below the image size
hlpr image resize -path photo.jpg --all

# photo.png -> favicon.ico (16, 32, 48, 64, 128, 256 px inside one file)
hlpr image resize -path photo.png --favicon
```

## Popular widths

`--all` uses these sizes: 16, 32, 48, 64, 128, 256, 320, 375, 414, 512, 640, 768, 1024, 1280, 1366, 1440, 1920, 2560, 3840.
`--favicon` uses these sizes: 16, 32, 48, 64, 128, 256. The ICO stores each size as PNG data, which Windows Vista and later and all modern browsers read. Sizes are capped at 256 px by the ICO format, so 180, 192, and 512 px icons are not included.
Only sizes smaller than the image's longest side are created. `--all` skips copies that already exist; `--favicon` refuses to overwrite an existing `favicon.ico`.

## Supported formats

`.png`, `.jpg`, `.jpeg`, `.bmp`, `.gif`, `.tif`, `.tiff`. The copy keeps the original format.

## Requirements

- **Windows** - built in (PowerShell with System.Drawing)
- **macOS** - built in (`sips`)
- **Linux** - ImageMagick (`convert` and `identify`), e.g. `apt install imagemagick`, `dnf install ImageMagick`, or `pacman -S imagemagick`

## Safety

- `-size` fails if its copy already exists; move or delete the old copy first.
- `--all` never overwrites: existing copies are skipped.
- Fails if the image is missing or the format is unsupported.

## See Also

- [Main hlpr README](../../../../README.md)
- [TypeScript Implementation](./resize.ts)
- [Tests](./resize.test.ts)
