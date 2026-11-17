export type SplashOutcome = 'ready' | 'failed' | 'timeout' | 'closed' | 'shutdown'

/** Own exactly one splash and timer; all racing terminal events share this gate. */
export function splashLifetime(
  dispose: () => void,
  failed: (reason: SplashOutcome) => void,
  schedule: (fn: () => void) => () => void
) {
  let settled = false
  let cancel = () => {}
  const finish = (reason: SplashOutcome) => {
    if (settled) return
    settled = true
    cancel()
    dispose()
    if (reason === 'failed' || reason === 'timeout') failed(reason)
  }
  cancel = schedule(() => finish('timeout'))
  return finish
}

export const splashHTML = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
body{margin:0;background:#142136;color:#fff;font:16px system-ui;display:grid;place-items:center;height:100vh}
main{text-align:center;animation:appear .15s ease-out}i{display:block;width:24px;height:24px;border:3px solid #56657a;border-top-color:#fff;border-radius:50%;margin:auto;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes appear{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){main,i{animation:none}}
</style></head><body><main role="status"><i aria-hidden="true"></i><p>Preparing your workspace…</p></main></body></html>`
