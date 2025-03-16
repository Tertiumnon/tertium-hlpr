# CoHelper (chlpr)

Run CLI commands line by line.

## Installation

```bash
npm i -g chlpr
```

## Usage

```bash
chlpr {{path/to/file-with-commands.sh}}
```

Example:

```bash
chlpr commands/common/hello/world.sh
```

## Development

To install dependencies:

```bash
bun install
```

To run:

```bash
bun index.ts {{path/to/file-with-commands.sh}}
```
