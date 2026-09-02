/**
 * start-multiplayer.ts
 * ─────────────────────────────────────────────────────────────────
 * Lance un tunnel Cloudflare sur le port 5173 (Vite).
 * Vite proxifie automatiquement toutes les requêtes API et
 * WebSocket (/ws) vers Elysia (port 3000).
 * ─────────────────────────────────────────────────────────────────
 * Usage : bun run multiplayer
 */

import { spawn, type ChildProcess } from 'child_process'
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')
const ENV_LOCAL = join(ROOT, 'apps', 'web', '.env.local')

interface TunnelResult {
  url: string
  proc: ChildProcess
}

function startTunnel(port: number, label: string): Promise<TunnelResult> {
  return new Promise((resolve, reject) => {
    console.log(`\n🚇 Démarrage du tunnel pour le port ${port} (${label})...`)

    const proc = spawn('npx', ['cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/
    let resolved = false

    const handleData = (data: Buffer) => {
      const text = data.toString()
      const match = text.match(urlRegex)
      if (match && !resolved) {
        resolved = true
        const url = match[0]
        console.log(`✅ Tunnel ${label} actif : ${url}`)
        resolve({ url, proc })
      }
    }

    proc.stdout.on('data', handleData)
    proc.stderr.on('data', handleData)

    proc.on('error', (err) => {
      if (!resolved) reject(err)
    })

    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`Tunnel ${label} s'est arrêté (code ${code})`))
      else console.warn(`⚠️  Tunnel ${label} s'est arrêté de façon inattendue`)
    })

    // Timeout après 30 secondes
    setTimeout(() => {
      if (!resolved) reject(new Error(`Timeout tunnel ${label} (30s)`))
    }, 30_000)
  })
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   🎮 Smik Party — Mode Multijoueur en ligne      ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log('║   Appuie sur Ctrl+C pour tout arrêter            ║')
  console.log('╚══════════════════════════════════════════════════╝')

  let frontProc: ChildProcess | null = null

  // Nettoyage à la fermeture
  const cleanup = () => {
    console.log('\n🛑 Arrêt du tunnel...')
    frontProc?.kill()
    process.exit(0)
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  try {
    // Si un ancien .env.local existe avec une URL obsolète, on le réinitialise
    if (existsSync(ENV_LOCAL)) {
      try {
        unlinkSync(ENV_LOCAL)
      } catch {}
    }

    // Lance le tunnel sur le port 5173 (qui proxifie tout : front + API + WebSocket)
    const front = await startTunnel(5173, 'Smik Party')
    frontProc = front.proc

    console.log('\n╔══════════════════════════════════════════════════════════════════╗')
    console.log('║   🎉 MULTIJOUEUR EN LIGNE PRÊT !                                 ║')
    console.log('╠══════════════════════════════════════════════════════════════════╣')
    console.log(`║   📱 Lien pour ton TÉLÉPHONE ou ton AMI :                         ║`)
    console.log(`║   ${front.url.padEnd(63)}║`)
    console.log('╠══════════════════════════════════════════════════════════════════╣')
    console.log('║   💻 Sur ton PC : tu peux jouer sur localhost:5173               ║')
    console.log('║   ou directement sur le lien ci-dessus !                         ║')
    console.log('╠══════════════════════════════════════════════════════════════════╣')
    console.log('║   Ctrl+C ici pour arrêter le tunnel                              ║')
    console.log('╚══════════════════════════════════════════════════════════════════╝\n')

    console.log('⏳ Tunnel actif — ce terminal doit rester ouvert pendant le jeu...\n')

    // RESTE EN VIE pour garder le tunnel ouvert
    await new Promise<void>((resolve) => {
      frontProc!.on('exit', resolve)
    })

  } catch (err) {
    console.error('❌ Erreur :', err)
    frontProc?.kill()
    process.exit(1)
  }
}

main()
