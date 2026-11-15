export interface OpenedFile {
  path: string
  name: string
  text: string
}

export interface DesktopAPI {
  getAppVersion: () => Promise<string>
  openFile: () => Promise<OpenedFile | null>
  saveFile: (defaultName: string, content: string) => Promise<boolean>
  onCommand: (callback: (command: string) => void) => () => void
}
