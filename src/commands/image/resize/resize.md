# image resize

Create resized copies of an image. Each copy is written next to the original as `<name>--<size>px.<ext>`, and its longest side is set to `<size>` pixels with the aspect ratio kept. The original is never changed.

With `-size <width>x<height>` the copy is `<name>--<width>x<height>px.<ext>` at exactly that size: the whole image is scaled to fit inside it and the empty space is filled with black bars. `-align` places the image horizontally; vertically it is always centered. To crop instead, use [image crop](../crop/crop.md).

## Usage

```bash
hlpr image resize -path <image> -size <px>
hlpr image resize -path <image> -size <width>x<height> [-align left|center|right]
hlpr image resize -path <image> --all
hlpr image resize -path <image> --favicon
```

### Arguments

- `-path <image>` - Path to the image file
- `-size <px>` - Length of the longest side in pixels (positive whole number)
- `-size <width>x<height>` - Exact output size, e.g. `1280x800`; fits the whole image and fills the rest with black
- `-align left|center|right` - Where the image sits when there are side bars (default `center`); only with `-size <width>x<height>`
- `--all` - Create one copy for each popular width that is smaller than the image
- `--favicon` - Create one `favicon.ico` file next to the image, holding 16, 32, 48, 64, 128, and 256 px icons (only sizes smaller than the image)

Use only one of `-size`, `--all`, or `--favicon`.

## Examples

```bash
# photo.jpg -> photo--256px.jpg
hlpr image resize -path photo.jpg -size 256

# icons/logo.png -> icons/logo--64px.png
hlpr image resize -path icons/logo.png -size 64

# photo.jpg -> photo--1280x800px.jpg, black bars split evenly
hlpr image resize -path photo.jpg -size 1280x800

# photo.jpg -> photo--1280x800px.jpg, image on the left, bar on the right
hlpr image resize -path photo.jpg -size 1280x800 -align left

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
