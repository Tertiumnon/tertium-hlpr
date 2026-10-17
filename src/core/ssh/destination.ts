import { readSsmParameter, validateParamName } from '../aws/param-store.js'
import { readOptionalEnvKey } from '../env-file.js'
import { type SshResolver, resolveSshHost } from './remote.js'

// Where a side of a command connects over ssh: `-ssh-host` (a HostName or Host alias from ~/.ssh/config) and
// `-ssh-user`, or the same two values from the `-ssm-param` env value. A flag wins over the parameter for its own
// field. The parameter's DB_SSH_* keys win over DEPLOY_*, as the deploy does.

export interface SshTarget {
  sshHost?: string;
  sshUser?: string;
  ssmParam?: string;
}

export interface DestinationDeps {
  resolve?: SshResolver;
  readParameter?: (name: string) => string;
}

/** The host and user an env value names. Either may be undefined. */
export function sshHostAndUserFromEnv(envText: string): { host?: string; user?: string } {
  const host = readOptionalEnvKey(envText, 'DB_SSH_HOST') ?? readOptionalEnvKey(envText, 'DEPLOY_HOST');
  const user = readOptionalEnvKey(envText, 'DB_SSH_USER') ?? readOptionalEnvKey(envText, 'DEPLOY_USER');
  return { host: host === '' ? undefined : host, user: user === '' ? undefined : user };
}

/** The ssh destination for a side: `user@host`, or the host alone when no user is known (ssh config decides). */
export function destinationFor(target: SshTarget, deps: DestinationDeps = {}): string {
  const resolve = deps.resolve ?? resolveSshHost;
  const flagHost = target.sshHost;
  const flagUser = target.sshUser;
  if (flagHost?.includes('@')) throw new Error('Invalid -ssh-host: give the user with -ssh-user')
  if (flagUser !== undefined) validateSshUser(flagUser);

  // The host comes from -ssh-host, or else from the parameter. The parameter's user is only used together with its own
  // host: a user for the flag's host has to come from -ssh-user or the ssh config, never from another machine's parameter.
  let host = flagHost;
  let user = flagUser;
  if (host === undefined && target.ssmParam !== undefined) {
    const readParameter = deps.readParameter ?? readSsmParameter;
    const fromParam = sshHostAndUserFromEnv(readParameter(validateParamName(target.ssmParam, '-ssm-param')));
    host = fromParam.host;
    user ??= fromParam.user;
  }
  if (host === undefined) throw new Error('Give -ssh-host, or -ssm-param whose value names DB_SSH_HOST or DEPLOY_HOST');

  const alias = resolve(host);
  validateSshHost(alias);
  return user === undefined ? alias : `${user}@${alias}`;
}

export function validateSshHost(host: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(host)) throw new Error('Invalid -ssh-host: use a HostName or Host alias from ~/.ssh/config');
  return host;
}

export function validateSshUser(user: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(user)) throw new Error('Invalid -ssh-user: use a login name');
  return user;
}

// Used where a destination is already resolved (user@host), for example by tests and callers that pass one.
export function validateSshDestination(destination: string): string {
  const at = destination.indexOf('@');
  if (at >= 0) {
    validateSshUser(destination.slice(0, at));
    validateSshHost(destination.slice(at + 1));
  } else {
    validateSshHost(destination);
  }
  return destination;
}

// The SSH target a parser's flags name. Missing flags stay undefined.
export function sshTargetFromFlags(values: Record<string, string | true>): SshTarget {
  const text = (flag: string) => (typeof values[flag] === 'string' ? (values[flag] as string) : undefined);
  return { sshHost: text('-ssh-host'), sshUser: text('-ssh-user'), ssmParam: text('-ssm-param') };
}
