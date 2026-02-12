import { spawn } from "child_process"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const isWin = process.platform === "win32"
const bin = (name) => path.join(root, "node_modules", ".bin", isWin ? name + ".cmd" : name)

const vite = spawn(bin("vite"), [], { cwd: root, stdio: "inherit", shell: true })
const server = spawn(bin("tsx"), ["server/index.ts"], { cwd: root, stdio: "inherit", shell: true })

vite.on("error", (err) => {
  console.error("Vite failed:", err)
  process.exit(1)
})
server.on("error", (err) => {
  console.error("Server failed:", err)
  process.exit(1)
})

vite.on("close", (code) => {
  if (code !== 0 && code !== null) process.exit(code)
})
server.on("close", (code) => {
  if (code !== 0 && code !== null) process.exit(code)
})

process.on("SIGINT", () => {
  vite.kill()
  server.kill()
  process.exit(0)
})
