import { createInstance, type i18n } from 'i18next'

// Literal keys also serve as a readable fallback in the core localization adapter.
export const en = {
  'Home': 'Home', 'Dashboard': 'Dashboard', 'Settings': 'Settings', 'Features': 'Features',
  'Feature: {{name}}': 'Feature: {{name}}', 'Dismiss notification': 'Dismiss notification',
  'Electron Starter': 'Electron Starter',
  'Main navigation': 'Main navigation', 'Application loading': 'Application loading',
  'Preparing your workspace': 'Preparing your workspace',
  'Loading settings and checking application state…': 'Loading settings and checking application state…',
  'Unable to start': 'Unable to start', 'Your settings could not be loaded.': 'Your settings could not be loaded.',
  'Try again': 'Try again', 'DESKTOP APPLICATION TEMPLATE': 'DESKTOP APPLICATION TEMPLATE',
  'Your next desktop app starts here.': 'Your next desktop app starts here.',
  'A secure native foundation, with the flexibility to make it yours.': 'A secure native foundation, with the flexibility to make it yours.',
  'Try the essentials': 'Try the essentials',
  'Native dialogs, typed IPC, persistent themes, and automatic updates.': 'Native dialogs, typed IPC, persistent themes, and automatic updates.',
  'Count is {{count}}': 'Count is {{count}}', 'Test Native Open Dialog': 'Test Native Open Dialog',
  'Show toast': 'Show toast', 'Ready': 'Ready', 'Menu command: {{command}}': 'Menu command: {{command}}',
  'Opened: {{name}}': 'Opened: {{name}}', 'Unable to open the file': 'Unable to open the file',
  'Theme saved': 'Theme saved', 'Unable to save the theme': 'Unable to save the theme',
  'Your app is ready to build': 'Your app is ready to build', 'Application health': 'Application health',
  'Version {{version}} · Secure preload bridge connected': 'Version {{version}} · Secure preload bridge connected',
  'Appearance': 'Appearance', 'System': 'System', 'Light': 'Light', 'Dark': 'Dark',
  'Saved locally. System mode follows your OS appearance.': 'Saved locally. System mode follows your OS appearance.',
  'Check for updates': 'Check for updates', 'Unable to check for updates': 'Unable to check for updates',
  'Page not found': 'Page not found', 'Return home': 'Return home',
  'Electron + Vite + React · Built for your next idea': 'Electron + Vite + React · Built for your next idea',
  'Something went wrong': 'Something went wrong',
  'Your app could not display this screen. Reload to try again.': 'Your app could not display this screen. Reload to try again.',
  'Reload application': 'Reload application', 'Desktop bridge unavailable': 'Desktop bridge unavailable',
  'Run npm run dev to open the Electron app. UI tests supply a mock bridge.': 'Run npm run dev to open the Electron app. UI tests supply a mock bridge.',
  'Restarting to install…': 'Restarting to install…', 'Checking for updates…': 'Checking for updates…',
  'Version {{version}} found. Preparing download…': 'Version {{version}} found. Preparing download…',
  'Downloading update: {{percent}}%': 'Downloading update: {{percent}}%',
  'Version {{version}} is ready to install.': 'Version {{version}} is ready to install.',
  'You are up to date.': 'You are up to date.',
  "Updates haven't been set up yet. No release has been published.": "Updates haven't been set up yet. No release has been published.",
  'Unable to restart. Please try again.': 'Unable to restart. Please try again.',
  'Application updates': 'Application updates', 'Update download progress': 'Update download progress',
  'The app will close. Your operating system will finish the installation.': 'The app will close. Your operating system will finish the installation.',
  'Restarting…': 'Restarting…', 'Restart & Install': 'Restart & Install',
  'File': 'File', 'New': 'New', 'Open…': 'Open…', 'Save': 'Save', 'Save As…': 'Save As…',
  'Edit': 'Edit', 'Find': 'Find', 'View': 'View', 'Window': 'Window', 'Help': 'Help',
  'Documentation': 'Documentation', 'Check for Updates…': 'Check for Updates…',
  'Language': 'Language', 'Follow operating system': 'Follow operating system',
  'Unable to save language': 'Unable to save language',
  'Update failed. Please try again.': 'Update failed. Please try again.',
  'Undo': 'Undo', 'Redo': 'Redo', 'Cut': 'Cut', 'Copy': 'Copy', 'Paste': 'Paste',
  'Delete': 'Delete', 'Select All': 'Select All', 'Quit': 'Quit', 'Close': 'Close',
  'Reload': 'Reload', 'Force Reload': 'Force Reload', 'Toggle Developer Tools': 'Toggle Developer Tools',
  'Actual Size': 'Actual Size', 'Zoom In': 'Zoom In', 'Zoom Out': 'Zoom Out',
  'Toggle Full Screen': 'Toggle Full Screen', 'Minimize': 'Minimize', 'Zoom': 'Zoom',
  'About': 'About', 'Services': 'Services', 'Hide': 'Hide', 'Hide Others': 'Hide Others',
  'Show All': 'Show All', 'Bring All to Front': 'Bring All to Front',
  'Paste and Match Style': 'Paste and Match Style'
} as const
export const es: Record<keyof typeof en, string> = {
  'Home': 'Inicio', 'Dashboard': 'Panel', 'Settings': 'Configuración', 'Features': 'Funciones',
  'Feature: {{name}}': 'Función: {{name}}', 'Dismiss notification': 'Cerrar aviso',
  'Electron Starter': 'Inicio de Electron',
  'Main navigation': 'Navegación principal', 'Application loading': 'Cargando la aplicación',
  'Preparing your workspace': 'Preparando tu espacio de trabajo',
  'Loading settings and checking application state…': 'Cargando la configuración y comprobando el estado de la aplicación…',
  'Unable to start': 'No se pudo iniciar', 'Your settings could not be loaded.': 'No se pudo cargar tu configuración.',
  'Try again': 'Reintentar', 'DESKTOP APPLICATION TEMPLATE': 'PLANTILLA DE APLICACIÓN DE ESCRITORIO',
  'Your next desktop app starts here.': 'Tu próxima aplicación de escritorio empieza aquí.',
  'A secure native foundation, with the flexibility to make it yours.': 'Una base nativa segura, con flexibilidad para personalizarla.',
  'Try the essentials': 'Prueba las funciones básicas',
  'Native dialogs, typed IPC, persistent themes, and automatic updates.': 'Diálogos nativos, IPC tipado, temas persistentes y actualizaciones automáticas.',
  'Count is {{count}}': 'El contador es {{count}}', 'Test Native Open Dialog': 'Probar el diálogo nativo de apertura',
  'Show toast': 'Mostrar aviso', 'Ready': 'Listo', 'Menu command: {{command}}': 'Comando del menú: {{command}}',
  'Opened: {{name}}': 'Abierto: {{name}}', 'Unable to open the file': 'No se pudo abrir el archivo',
  'Theme saved': 'Tema guardado', 'Unable to save the theme': 'No se pudo guardar el tema',
  'Your app is ready to build': 'Tu aplicación está lista para desarrollar', 'Application health': 'Estado de la aplicación',
  'Version {{version}} · Secure preload bridge connected': 'Versión {{version}} · Puente de precarga seguro conectado',
  'Appearance': 'Apariencia', 'System': 'Sistema', 'Light': 'Claro', 'Dark': 'Oscuro',
  'Saved locally. System mode follows your OS appearance.': 'Guardado localmente. El modo del sistema sigue la apariencia del sistema operativo.',
  'Check for updates': 'Buscar actualizaciones', 'Unable to check for updates': 'No se pudieron buscar actualizaciones',
  'Page not found': 'Página no encontrada', 'Return home': 'Volver al inicio',
  'Electron + Vite + React · Built for your next idea': 'Electron + Vite + React · Creado para tu próxima idea',
  'Something went wrong': 'Algo salió mal',
  'Your app could not display this screen. Reload to try again.': 'La aplicación no pudo mostrar esta pantalla. Recarga para reintentar.',
  'Reload application': 'Recargar la aplicación', 'Desktop bridge unavailable': 'Puente de escritorio no disponible',
  'Run npm run dev to open the Electron app. UI tests supply a mock bridge.': 'Ejecuta npm run dev para abrir la aplicación Electron. Las pruebas de interfaz usan un puente simulado.',
  'Restarting to install…': 'Reiniciando para instalar…', 'Checking for updates…': 'Buscando actualizaciones…',
  'Version {{version}} found. Preparing download…': 'Versión {{version}} encontrada. Preparando la descarga…',
  'Downloading update: {{percent}}%': 'Descargando actualización: {{percent}}%',
  'Version {{version}} is ready to install.': 'La versión {{version}} está lista para instalar.',
  'You are up to date.': 'La aplicación está actualizada.',
  "Updates haven't been set up yet. No release has been published.": 'Las actualizaciones aún no están configuradas. No se ha publicado ninguna versión.',
  'Unable to restart. Please try again.': 'No se pudo reiniciar. Inténtalo de nuevo.',
  'Application updates': 'Actualizaciones de la aplicación', 'Update download progress': 'Progreso de la descarga',
  'The app will close. Your operating system will finish the installation.': 'La aplicación se cerrará. El sistema operativo finalizará la instalación.',
  'Restarting…': 'Reiniciando…', 'Restart & Install': 'Reiniciar e instalar',
  'File': 'Archivo', 'New': 'Nuevo', 'Open…': 'Abrir…', 'Save': 'Guardar', 'Save As…': 'Guardar como…',
  'Edit': 'Editar', 'Find': 'Buscar', 'View': 'Ver', 'Window': 'Ventana', 'Help': 'Ayuda',
  'Documentation': 'Documentación', 'Check for Updates…': 'Buscar actualizaciones…',
  'Language': 'Idioma', 'Follow operating system': 'Seguir el sistema operativo',
  'Unable to save language': 'No se pudo guardar el idioma',
  'Update failed. Please try again.': 'Falló la actualización. Inténtalo de nuevo.',
  'Undo': 'Deshacer', 'Redo': 'Rehacer', 'Cut': 'Cortar', 'Copy': 'Copiar', 'Paste': 'Pegar',
  'Delete': 'Eliminar', 'Select All': 'Seleccionar todo', 'Quit': 'Salir', 'Close': 'Cerrar',
  'Reload': 'Recargar', 'Force Reload': 'Forzar recarga', 'Toggle Developer Tools': 'Alternar herramientas de desarrollo',
  'Actual Size': 'Tamaño real', 'Zoom In': 'Acercar', 'Zoom Out': 'Alejar',
  'Toggle Full Screen': 'Alternar pantalla completa', 'Minimize': 'Minimizar', 'Zoom': 'Ampliar',
  'About': 'Acerca de', 'Services': 'Servicios', 'Hide': 'Ocultar', 'Hide Others': 'Ocultar las demás',
  'Show All': 'Mostrar todo', 'Bring All to Front': 'Traer todo al frente',
  'Paste and Match Style': 'Pegar con el mismo estilo'
}
export type Locale = 'en' | 'es'
export type LocalePreference = Locale | 'system'
export interface LocaleState { preference: LocalePreference; locale: Locale }
export function normalizeLocale(tag: string): Locale {
  try { return new Intl.Locale(tag.replaceAll('_', '-')).language === 'es' ? 'es' : 'en' }
  catch { return 'en' }
}
export async function createTranslations(locale: Locale): Promise<i18n> {
  const instance = createInstance()
  await instance.init({
    resources: { en: { translation: en }, es: { translation: es } }, lng: locale, fallbackLng: 'en',
    supportedLngs: ['en', 'es'], keySeparator: false, nsSeparator: false, initAsync: false,
    interpolation: { escapeValue: true }, returnEmptyString: false
  })
  return instance
}
// React text nodes provide HTML escaping. Never pass these results to innerHTML.
export function textTranslator(instance: i18n) {
  return (key: string, values?: Record<string, string | number>) =>
    String(instance.t(key, { ...values, interpolation: { escapeValue: false } }))
}
export const formatNumber = (locale: Locale, value: number) => new Intl.NumberFormat(locale).format(value)
export const formatDate = (locale: Locale, value: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
