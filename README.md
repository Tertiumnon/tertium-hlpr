# hlpr

```text
    |==|   |==|
    |  |   |  |
    |  |   |  |
   _|__|___|__|_
  /  ___   ___  \
 |  | o | | o |  |   hlpr
 |  '---' '---'  |   I'll automate you...
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

hlpr aims to make everyday command-line tasks simpler across Windows, macOS, and Linux. Commands use `hlpr <domain> <command> [params]`, such as `hlpr net scan`, `hlpr process list`, and `hlpr file rename`.

> **Note:** This app is in development. Commands, behavior, and documentation are still evolving and may change without notice.

## Install

```sh
npm install -g @tertium/hlpr
```

Requires Node.js. Shell commands require Bash (Git Bash on Windows). Other requirements are listed in each command's documentation.

## Usage

```sh
hlpr help
hlpr net list -device
hlpr net status
hlpr net scan
hlpr memory info
hlpr system info
hlpr battery status
hlpr ssh mkcon
hlpr ssh mkkey
hlpr git create -b feature/example
hlpr file rename -dir ./src -style kebab -r -d -f --dry
```

## Commands

| Command                                             | Purpose                                 |
|-----------------------------------------------------|-----------------------------------------|
| [file rename](src/commands/file/rename/README.md) | Rename files and directories |
| [file move](src/commands/file/move/README.md) | Move a file and update references |
| [file find](src/commands/file/find/README.md) (`search`) | Find files by name |
| [git](src/commands/git/README.md)                   | Manage branches and working files       |
| [git setup -hooks](src/commands/git/setup/README.md) | Write a shared pre-commit hook |
| [npm scripts](src/commands/npm/scripts/README.md) | Add missing start and dev npm scripts |
| [gh setup](src/commands/gh/setup/README.md) | Write GitHub workflows: npm publish (trusted publishing) and SSH deploy |
| [az setup](src/commands/az/setup/README.md) | Write an Azure Pipelines SSH deploy (`azure-pipelines.yml`) |
| [angular setup](src/commands/angular/setup/README.md) | Set up an Angular project with bun, biome, hooks, and changelog |
| [net list -device](src/commands/net/list/README.md)   | List cached local device IPv4 addresses |
| [net scan](src/commands/net/scan/README.md)         | List local ports and connections        |
| [net status](src/commands/net/status/README.md) (`info`) | Show network interface addresses |
| [system info](src/commands/system/info/README.md) (`status`) | Show hardware, OS, and physical RAM module details |
| [battery status](src/commands/battery/status/README.md) (`info`) | Show battery charge and status |
| [memory info](src/commands/memory/info/README.md) (`status`) | Show total, used, and free memory |
| [disk info](src/commands/disk/info/README.md) (`status`) | Show disk usage and available space |
| [process list](src/commands/process/list/README.md) | List running processes |
| [process kill](src/commands/process/kill/README.md) | Kill a process by ID or port |
| [app list](src/commands/app/list/README.md) | List installed apps |
| [app search](src/commands/app/search/README.md) (`find`) | Find installed apps or remote packages by name |
| [app remove](src/commands/app/remove/README.md) (`delete`, `uninstall`) | Find and uninstall an app |
| [tool install](src/commands/tool/install/README.md) | Install Docker, htop, fastfetch, Starship, Claude CLI, Codex CLI, Copilot CLI, or another supported tool |
| [runtime install](src/commands/runtime/install/README.md) | Install Node.js, Python, Bun, Rust, or Go |
| [ssh mkcon](src/commands/ssh/mkcon/README.md) | Create a key, authorize it on a host, and save the connection |
| [ssh mkkey](src/commands/ssh/mkkey/README.md) | Create a key pair and save the connection locally |
| [zsh fix --bun](src/commands/zsh/README.md) | Add bun to PATH in ~/.zshrc |
| [ssh setup](src/commands/ssh/README.md#setup) | Create ~/.ssh with the permissions SSH requires |
| [ssh fix --permissions](src/commands/ssh/README.md#fix) | Fix permissions of ~/.ssh and its files |
| [ssh read](src/commands/ssh/read/README.md) | Print one connection's Host block from ~/.ssh/config |
| [hello](src/commands/hello/README.md) | Run a Matrix rain animation |
| [hello world](src/commands/hello/world/README.md) | Display animated Hello World art |
| [self update](src/commands/self/update/README.md) (`self upgrade`) | Update hlpr and repair broken command files |
| [self fix](src/commands/self/fix/README.md) | Reinstall hlpr when command files are missing |
| [help](src/commands/help/README.md)                 | Show available commands                 |

[Support the project](https://ko-fi.com/tertiumnon)

License: MIT.
