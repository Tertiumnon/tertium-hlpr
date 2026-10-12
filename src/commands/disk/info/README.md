# disk info

Show mounted volumes in a vertical list, with a usage bar and total, used, and
available capacity for each volume. Sizes use binary units (GiB, TiB).

```sh
hlpr disk info
hlpr disk info --help
```

Uses PowerShell/CIM on Windows and `df -kP` on Linux/macOS. Lists mounted volumes,
not unmounted physical drives. Network and virtual filesystems may appear.
Available space can exclude reserved blocks, so used plus available may be less
than total. Do not add capacities of volumes that share a storage pool.
