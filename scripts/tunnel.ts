import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

const PROJECT_ROOT = process.cwd()
const TOOLS_DIR = join(PROJECT_ROOT, 'tools')
const CLOUDFLARED_EXE = join(TOOLS_DIR, 'cloudflared.exe')
const TARGET_PORT = process.env.PORT || '5173'
const TARGET_URL = `http://localhost:${TARGET_PORT}`

async function ensureCloudflared(): Promise<string> {
  if (existsSync(CLOUDFLARED_EXE)) {
    return CLOUDFLARED_EXE
  }

  console.log('⬇️  Téléchargement de cloudflared (100% gratuit, aucun compte requis)...')
  const downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'

  try {
    const res = await fetch(downloadUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    await Bun.write(CLOUDFLARED_EXE, arrayBuffer)
    console.log('✅ cloudflared téléchargé avec succès dans ./tools/cloudflared.exe\n')
    return CLOUDFLARED_EXE
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Impossible de télécharger cloudflared automatiquement (${message}).\n` +
      `Téléchargez manuellement cloudflared-windows-amd64.exe depuis :\n` +
      `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe\n` +
      `et placez-le dans le dossier : ${CLOUDFLARED_EXE}`
    )
  }
}

async function startTunnel(): Promise<void> {
  console.log('========================================================================')
  console.log('🚀 DÉMARRAGE DU TUNNEL INTERNET CLOUDFLARE POUR SMIK PARTY')
  console.log('========================================================================')
  console.log(`📡 Cible locale : ${TARGET_URL}`)
  console.log('🔒 Sécurisé HTTPS & WSS (WebSocket) | 100% Gratuit pour toujours')
  console.log('⏳ Création du tunnel en cours...')

  const binaryPath = await ensureCloudflared()

  const child: ChildProcess = spawn(
    binaryPath,
    ['tunnel', '--url', TARGET_URL, '--no-autoupdate'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    }
  )

  let publicUrlFound = false
  const logBuffer: string[] = []

  const handleOutput = (data: Buffer | string): void => {
    const text = data.toString()
    logBuffer.push(text)
    if (logBuffer.length > 20) logBuffer.shift()

    // Match URL https://<subdomain>.trycloudflare.com
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
    if (match && !publicUrlFound) {
      publicUrlFound = true
      const url = match[0]
      console.log('\n========================================================================')
      console.log('🎉 SMIK PARTY EST EN LIGNE SUR INTERNET !')
      console.log('========================================================================')
      console.log('🔗 URL À PARTAGER À VOS AMIS / JOUEURS :')
      console.log(`   👉 \x1b[1m\x1b[32m${url}\x1b[0m 👈`)
      console.log('')
      console.log('💡 Note :')
      console.log('   - Fonctionne sur smartphone et PC externe.')
      console.log('   - Appuyez sur Ctrl+C pour arrêter le partage.')
      console.log('========================================================================\n')
    }
  }

  if (child.stdout) child.stdout.on('data', handleOutput)
  if (child.stderr) child.stderr.on('data', handleOutput)

  child.on('error', (err: Error) => {
    console.error('❌ Erreur lors du lancement de cloudflared :', err.message)
  })

  child.on('close', (code: number | null) => {
    if (!publicUrlFound) {
      console.error('⚠️ Le tunnel s\'est fermé sans avoir pu générer d\'URL publique.')
      console.error('Derniers logs cloudflared :\n', logBuffer.join(''))
    } else {
      console.log(`\n🛑 Tunnel fermé (code de sortie : ${code ?? 0}).`)
    }
    process.exit(code ?? 0)
  })

  const shutdown = (): void => {
    console.log('\n🛑 Arrêt du tunnel Cloudflare...')
    try {
      child.kill()
    } catch {
      // Ignored
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('exit', shutdown)
}

startTunnel().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('❌ Erreur :', message)
  process.exit(1)
})
