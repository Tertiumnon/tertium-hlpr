# net list -device

List known local-network device IPv4 addresses, one per line.

```bash
hlpr net list -device
hlpr net list -d
hlpr net list -device --help
```

`-device` and `-d` are equivalent. One of these flags is required.

Reads the system's neighbor/ARP cache using `arp -a` on Windows, `arp -an`
on macOS, or `ip -4 neigh show` on Linux (requires iproute2). Duplicate IPs,
broadcast/multicast entries, and unresolved neighbors are excluded.

This is a cached list, not an active network sweep: devices not yet contacted
may be missing, and cached devices may now be offline. Includes neighbors on
virtual adapters as well as physical networks. IPv6 is not included.

Use `hlpr net scan` to list ports and connections on this computer.
