// Git reads GIT_DIR, GIT_WORK_TREE and GIT_INDEX_FILE before the working directory. Inside a git hook they
// point at the repository being committed, so a git command meant for another folder would change that one.
export const REPO_PINNING_VARIABLES = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']

/** The environment for a command that must act on its `cwd` repository. */
export const envForCwd = (): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(process.env).filter(([key]) => !REPO_PINNING_VARIABLES.includes(key)))
