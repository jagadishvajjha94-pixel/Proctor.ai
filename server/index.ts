await import("dotenv/config").catch(() => ({}))
import { createApp } from "./app"

const PORT = process.env.PORT || 5000
const isProd = process.env.NODE_ENV === "production"

const app = createApp()
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  if (!isProd) console.log("API at http://localhost:" + PORT + "/api")
})
