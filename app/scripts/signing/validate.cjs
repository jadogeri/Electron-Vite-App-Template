const { execFileSync } = require('node:child_process')
function validateSigning(platform, env) {
  const required = platform === 'darwin'
    ? ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
    : platform === 'win32' ? ['CSC_LINK', 'CSC_KEY_PASSWORD'] : []
  if (!required.length) throw new Error('Signed builds require macOS or Windows')
  const missing = required.filter(name => !env[name]?.trim())
  if (missing.length) throw new Error(`Missing signing configuration: ${missing.join(', ')}`)
  // Do not auto-discover an unrelated local identity or accept ad hoc signing.
  if (env.CSC_IDENTITY_AUTO_DISCOVERY === 'false' && platform === 'darwin') throw new Error('Signing identity discovery must be enabled for the supplied certificate')
  if (env.CSC_NAME === '-') throw new Error('Ad hoc signing is forbidden')
  if (platform === 'darwin' && !/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID)) throw new Error('Invalid Apple team configuration')
  return true
}
function verifyArtifact(platform, artifact) {
  if (!artifact || artifact.includes('\0')) throw new Error('A native artifact is required')
  const run = (command, args) => execFileSync(command, args, { stdio: 'pipe' })
  try {
    if (platform === 'darwin') {
      run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', artifact])
      run('spctl', ['--assess', '--type', 'execute', '--verbose=2', artifact])
      run('xcrun', ['stapler', 'validate', artifact])
    } else if (platform === 'win32') {
      // Environment passing, never command-string interpolation of a path.
      const script = '$s=Get-AuthenticodeSignature -LiteralPath $env:VERIFY_ARTIFACT; if($s.Status -ne "Valid" -or -not $s.SignerCertificate -or -not $s.TimeStamperCertificate){exit 1}'
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'pipe', env: { ...process.env, VERIFY_ARTIFACT: artifact } })
    } else throw new Error()
  } catch { throw new Error('Native signature, trust or timestamp verification failed') }
}
module.exports = { validateSigning, verifyArtifact }
if (require.main === module) {
  try {
    if (process.argv[2] === 'verify') verifyArtifact(process.platform, process.argv[3])
    else validateSigning(process.platform, process.env)
    console.log('Signing configuration or verification passed')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
