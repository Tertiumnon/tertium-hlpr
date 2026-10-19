# Changelog

## 0.25.0 - 2026-10-19

- feat: add image resize command

## 0.24.0 - 2026-10-19

- feat: add animation play and tui run commands
- docs: remove project.json, replaced by project.yml
- docs: project attributes in project.yml
- docs: add project.json attributes
- docs: use the scoped package name as the project title

## 0.23.2 - 2026-10-18

- fix: app install/uninstall - search strongly by name

## 0.23.1 - 2026-10-18

- docs(app): list snap, flatpak and zypper in app command docs
- feat(app): remove apps from a keyboard menu
- feat(app): install apps from a keyboard-selected package
- docs: update to standard way

## 0.23.0 - 2026-10-17

- docs: list aws-param-store add and remove and the new ssh destination flags
- refactor(pm2): take the ssh destination from -ssh-host, -ssh-user or -ssm-param
- refactor(mariadb): take the ssh destination from -ssh-host, -ssh-user or -ssm-param
- feat(ssh): take the connection from -ssh-host and -ssh-user or an SSM env value
- feat(aws-param-store): add add and remove commands

## 0.22.0 - 2026-10-17

- refactor(mariadb): read set-user-password's password from stdin when not given
- docs: list set-user-password, rotate-password and pm2 commands
- feat(pm2): add start, stop, restart and status over SSH
- feat(mariadb): add rotate-password for a user and its DATABASE_URL parameter
- feat(ssh): use a Host alias as written when -host names one
- refactor(core): move parseFlags to core/args for every command

## 0.21.0 - 2026-10-17

- docs: list aws-param-store set in README and help test
- feat(aws-param-store): add set and read -key for one .env variable
- docs: list file, aws-param-store and mariadb commands in README and help test
- feat(mariadb): add backup, sync and user-password over SSH
- feat(aws-param-store): add read and edit for Parameter Store values
- feat(file): add read and edit for remote files over SSH
- feat(ssh): look up connections by HostName and remove ssh read
- feat(core): add -editor choice for file and aws edit commands

## 0.20.0 - 2026-10-17

- docs(changelog): drop hand-written Unreleased; release entries are generated
- chore: use gith changelog for the version script
- refactor(git)!: move git setup to gith setup -n npm

## 0.19.0 - 2026-10-17

- feat(gh): add rename and change commands
- chore: update to a new gith cli util approach
- feat(git): restore setup with --hooks --npm
- refactor(git)!: remove hlpr git commands, moved to @tertium/gith

## 0.18.0 - 2026-10-16

- docs: update root command table and AGENTS example
- fix(help): show runnable "also" commands and source descriptions
- refactor(runtime): match install help with tool install
- feat(system): read Linux RAM modules with dmidecode
- feat(zsh): add fix --bun to put bun on PATH in .zshrc
- feat(tool): add Claude, Codex, and Copilot CLI installs
- feat(ssh): add mkkey, setup, and fix; rename mkconn to mkcon
- fix: make info output color explicit so tests are TTY-independent
- feat(app): search remote package catalogs with --remote

## 0.17.0 - 2026-10-16

- feat: process kill -folder, -file and -path targets

## 0.16.0 - 2026-10-13

- feat: add angular, npm, git, gh, az and ssh read commands with changelog

