# system info

Show a table of CPU, RAM, OS, architecture, hostname, uptime, and network addresses.

```sh
hlpr system info
hlpr system info --help
```

Windows also shows manufacturer/model, motherboard, BIOS, physical CPU core count,
and GPU using PowerShell/CIM. Linux reads model and board details from
`/sys/class/dmi/id`. macOS reports the model identifier using `sysctl`.
Missing or inaccessible hardware details are marked unavailable; no elevation is requested.

RAM used is total minus OS-reported free memory, which can include caches.
Virtual machines report the virtual hardware exposed by the host.
