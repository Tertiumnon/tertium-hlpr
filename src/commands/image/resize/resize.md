# image resize

Create resized copies of an image. Each copy is written next to the original as `<name>--<size>px.<ext>`, and its longest side is set to `<size>` pixels with the aspect ratio kept. The original is never changed.

## Usage

```bash
hlpr image resize -path <image> -size <px>
hlpr image resize -path <image> --all
```

### Arguments

- `-path <image>` - Path to the image file
- `-size <px>` - Length of the longest side in pixels (positive whole number)
- `--all` - Create one copy for each popular width that is smaller than the image

## Examples

```bash
# photo.jpg -> photo--256px.jpg
hlpr image resize -path photo.jpg -size 256

# icons/logo.png -> icons/logo--64px.png
hlpr image resize -path icons/logo.png -size 64

# photo.jpg -> photo--16px.jpg, photo--32px.jpg, ... for every popular width below the image size
hlpr image resize -path photo.jpg --all
```

## Popular widths

`--all` uses these sizes: 16, 32, 48, 64, 128, 256, 320, 375, 414, 512, 640, 768, 1024, 1280, 1366, 1440, 1920, 2560, 3840.
Only sizes smaller than the image's longest side are created. A copy that already exists is skipped and listed, so a rerun fills in what is missing.

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
