type Values = Record<string, string | number>
type Translator = (key: string, values?: Values) => string
let translator: Translator = (key, values) => key.replace(/\{\{(\w+)\}\}/g, (match, name) => String(values?.[name] ?? match))
export function setMainTranslator(fn: Translator): void { translator = fn }
export function translateMain(key: string, values?: Values): string { return translator(key, values) }
