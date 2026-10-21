# image crop

Create a copy of an image at an exact size. The image is scaled to cover the size, and whatever sticks out is cropped. The copy is written next to the original as `<name>--<width>x<height>px-crop.<ext>`. The original is never changed.

To keep the whole image and fill the rest with black bars instead, use [image resize](../resize/resize.md) with `-size <width>x<height>`.

## Usage

```bash
hlpr image crop -path <image> -size <width>x<height> [-align left|center|right]
```

### Arguments

- `-path <image>` - Path to the image file
- `-size <width>x<height>` - Exact output size, e.g. `1280x800`
- `-align left|center|right` - Part of the image to keep when cropping width (default `center`); vertical overflow is always cropped from the center

## Examples

```bash
# photo.jpg -> photo--1280x800px-crop.jpg, cropped from the center
hlpr image crop -path photo.jpg -size 1280x800

# photo.jpg -> photo--1280x800px-crop.jpg, keeping the left part
hlpr image crop -path photo.jpg -size 1280x800 -align left
```

## Supported formats

`.png`, `.jpg`, `.jpeg`, `.bmp`, `.gif`, `.tif`, `.tiff`. The copy keeps the original format.

## Requirements

- **Windows** - built in (PowerShell with System.Drawing)
- **macOS** - built in (`sips`)
- **Linux** - ImageMagick (`convert` and `identify`), e.g. `apt install imagemagick`, `dnf install ImageMagick`, or `pacman -S imagemagick`

## Safety

- Fails if the copy already exists; move or delete the old copy first.
- Fails if the image is missing or the format is unsupported.

## See Also

- [Main hlpr README](../../../../README.md)
- [TypeScript Implementation](./crop.ts)
- [Tests](./crop.test.ts)
