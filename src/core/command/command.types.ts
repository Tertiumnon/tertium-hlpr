export interface BaseCommandOptions {
  force?: boolean
  verbose?: boolean
}

export interface DryRunOptions {
  dryRun?: boolean
}

export interface KillPortOptions extends BaseCommandOptions {}
