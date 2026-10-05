import { spawn, execSync } from 'child_process'
import http from 'http'

async function isEmulatorRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8085', () => {
      resolve(true)
    })
    req.on('error', () => {
      resolve(false)
    })
    req.setTimeout(1000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function waitForEmulator(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isEmulatorRunning()) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function main() {
  console.log('🔍 Checking if Firestore emulator is running on port 8085...')
  let running = await isEmulatorRunning()

  if (!running) {
    console.log('🚀 Firestore emulator is not running. Starting emulator...')
    spawn('npx', ['firebase', 'emulators:start', '--only', 'firestore,database'], {
      stdio: 'inherit',
      shell: true
    })

    console.log('⏳ Waiting for Firestore emulator to become ready...')
    const ready = await waitForEmulator()
    if (!ready) {
      console.error('❌ Emulator failed to start within 30 seconds.')
      process.exit(1)
    }
  } else {
    console.log('✅ Firestore emulator is already running!')
  }

  console.log('🌱 Seeding local emulator with Bangladesh Football League test data...')
  try {
    execSync('node scripts/seed-emulator.js', { stdio: 'inherit' })
  } catch (err) {
    console.warn('⚠️ Seeding failed or skipped:', err.message)
  }

  console.log('⚡ Launching Vite Dev Server connected to Local Emulator...')
  const env = { ...process.env, VITE_USE_EMULATOR: 'true' }
  const devServer = spawn('npx', ['vite', '--host'], {
    stdio: 'inherit',
    env,
    shell: true
  })

  devServer.on('exit', (code) => {
    process.exit(code)
  })
}

main().catch((err) => {
  console.error('Error starting dev server with emulator:', err)
  process.exit(1)
})
