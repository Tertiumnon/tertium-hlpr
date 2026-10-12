# system info

Show a table grouped by M/B, BIOS, expansion, CPU, RAM, GPU, disks, OS, and uptime.

```sh
hlpr system info
hlpr system status
hlpr system info --help
```

Windows shows motherboard and BIOS details, CPU socket, reported PCI slots, physical CPU cores,
GPU manufacturer, name, memory type, physical memory, and VRAM using PowerShell/CIM; NVIDIA VRAM
uses `nvidia-smi` when available to avoid the 4 GiB limit in Windows CIM. Windows
CIM may only provide a generic memory type for discrete GPUs. Physical disks are
listed by model with bus type, media type, and capacity. Expansion details include
firmware-reported PCI slots and detected SATA/NVMe drive counts. Total SATA/M.2
connectors are not reliably exposed by Windows.
Each RAM module is listed on its own line
with its firmware-reported slot name, part or manufacturer name, physical capacity, and
rated/configured frequency. Linux reads available board details from
`/sys/class/dmi/id`, PCI slots from sysfs, physical core counts from `lscpu`,
disks from `lsblk`, and the distribution name from `/etc/os-release`. macOS reports the
model identifier using `sysctl`. Firmware restrictions can hide hardware details.
Fields and sections without reported values are omitted on Linux and macOS.
Per-module RAM names/frequencies and GPU names are currently supplied by Windows CIM.
Empty RAM slots appear as `<free>` only when firmware reports total slot count; some
systems report installed modules only, so they cannot identify free slots.

This command shows physical memory modules only. Use `hlpr memory info` for total,
used, and free RAM. Virtual machines report the hardware exposed by the host.
Use `hlpr net status` for interface addresses.
