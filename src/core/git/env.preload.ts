import { REPO_PINNING_VARIABLES } from './env.js'

// Tests create throwaway repositories by working directory. Run from a commit hook, the inherited GIT_* variables
// would point their git commands at this repository instead, so they are cleared before any test runs.
for (const key of REPO_PINNING_VARIABLES) delete process.env[key]
