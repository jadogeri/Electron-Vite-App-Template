export interface OpenedFile {
  path: string
  name: string
  text: string
}

export type UpdateState =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'not-available' }
  | { status: 'error'; message: string }

export interface DesktopAPI {
  getAppVersion: () => Promise<string>
  openFile: () => Promise<{ path: string; name: string; text: string } | null>
  saveFile: (defaultName: string, content: string) => Promise<boolean>
  onCommand: (callback: (command: string) => void) => () => void
  onUpdateStatus: (callback: (state: UpdateState) => void) => () => void
  installUpdate: () => Promise<void>
}

