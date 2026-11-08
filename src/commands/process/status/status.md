# process status

```sh
hlpr process status -name <name>
hlpr process info -name <name>
```

Matches executable names case-insensitively by substring and summarizes every
match and its descendants, counting each process once. The summary shows process
count, total CPU percentage and resident memory in MiB. A CPU value of 100%
represents one fully used core, so totals can exceed 100%. Memory sums resident
working sets and may count shared memory more than once.

Windows uses PowerShell and Windows process performance counters. Linux and
macOS use `ps`; its CPU percentage is an operating-system estimate and may
represent a lifetime average rather than current activity. Processes can start
or exit during collection, and detached processes are not descendants. The
command fails if no name matches or required counters are unavailable.

