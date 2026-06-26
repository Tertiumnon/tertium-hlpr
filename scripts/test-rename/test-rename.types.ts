import { SpawnSyncReturns } from "node:child_process";

export interface TestFile {
  path: string;
  content: string;
}

export type SpawnResult = SpawnSyncReturns<string>;
