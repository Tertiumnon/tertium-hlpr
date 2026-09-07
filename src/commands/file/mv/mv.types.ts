export interface UpdatedFile {
  file: string
  count: number
}

export interface MoveResult {
  from: string
  to: string
  root: string
  updatedFiles: UpdatedFile[]
  bareBasenameAmbiguous: boolean
}

export interface MoveOptions {
  root?: string
  dryRun?: boolean
  updateContent?: boolean
  force?: boolean
}

export type MatchKind = 'file-relative' | 'root-relative' | 'bare-basename'
