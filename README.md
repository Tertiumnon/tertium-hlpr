# hlpr

```text
    |==|   |==|
    |  |   |  |
    |  |   |  |
   _|__|___|__|_
  /  ___   ___  \
 |  | o | | o |  |   hlpr
 |  '---' '---'  |   your CLI helper
 |      /_\      |
  \   .----- .  /
   '._|_|_|__.'
      _|===|_
  o--| [ > ] |--o
 /   |_______|   \
[ ]    || ||    [ ]
     __|| ||__
    |___| |___|
```

hlpr aims to make everyday command-line tasks simpler across Windows, macOS, and Linux. It brings useful commands together with consistent, natural names—like `net list -device`, `list process`, and `git create`—so you can focus on what you want to do instead of remembering different commands for each environment.

## Install

```sh
npm install -g @tertium/hlpr
```

Requires Node.js. Shell commands require Bash (Git Bash on Windows). Other requirements are listed in each command's documentation.

## Usage

```sh
hlpr help
hlpr net list -device
hlpr net scan
hlpr git create -b[ranch] feature/example
hlpr rename -dir ./src -style kebab -r -d -f --dry
```

## Commands

| Command                                             | Purpose                                 |
|-----------------------------------------------------|-----------------------------------------|
| [rename](src/commands/rename/README.md) (`rn`)      | Rename files and directories            |
| [mv](src/commands/mv/README.md)                     | Move a file and update references       |
| [git](src/commands/git/README.md)                   | Manage branches and working files       |
| [net list -device](src/commands/net/list/README.md)   | List cached local device IPv4 addresses |
| [net scan](src/commands/net/scan/README.md)         | List local ports and connections        |
| [system info](src/commands/system/info/README.md) | Show hardware, OS, and RAM information |
| [disk info](src/commands/disk/info/README.md) | Show disk usage and available space |
| [list process](src/commands/list/process/README.md) | List running processes                  |
| [kill process](src/commands/kill/process/README.md) | Kill a process by ID or port            |
| [list app](src/commands/list/app/README.md)         | List installed apps                     |
| [install](src/commands/install/README.md) (`i`)     | Install supported tools                 |
| [nvm](src/commands/nvm/README.md)                   | Install or switch Node.js versions      |
| [ssh](src/commands/ssh/README.md)                   | Set up the SSH directory                |
| [hello](src/commands/hello/README.md)               | Run terminal demos                      |
| [update](src/commands/update/README.md) (`upgrade`) | Update hlpr globally through npm        |
| [help](src/commands/help/README.md)                 | Show available commands                 |

License: MIT.
