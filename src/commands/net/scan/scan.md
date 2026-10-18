# net scan

Show TCP/UDP ports in use on this computer, including listening sockets and active connections.

```bash
hlpr net scan
hlpr net scan --help
```

Uses the native tool's table: `netstat -ano` on Windows, `ss -tunap` on Linux
(requires iproute2), and `lsof -nP -iTCP -iUDP` on macOS. Addresses and ports
are numeric. Process IDs are shown where permissions allow; elevated privileges
may be needed to see other users' processes. This lists local sockets and does
not probe remote hosts or determine whether a firewall allows access.
