/**
 * Append rows to a Google Sheet using a service account.
 * Requires GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY (JSON string).
 */

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SHEETS_APPEND = (sheetId: string, sheetName?: string) => {
  const range = sheetName ? `'${sheetName.replace(/'/g, "''")}'!A1` : "A1"
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`
}

interface ServiceAccountKey {
  client_email: string
  private_key: string
}

async function getAccessToken(keyJson: ServiceAccountKey): Promise<string> {
  const jose = await import("jose")
  const privateKey = await jose.importPKCS8(keyJson.private_key.replace(/\\n/g, "\n"), "RS256")
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new jose.SignJWT({ scope: SHEETS_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(keyJson.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  })
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google token error: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/**
 * Append rows to the first sheet (or named sheet). headers + rows become sheet rows.
 * Row keys must match header strings exactly for correct column mapping.
 * @param sheetName - Optional sheet tab name (e.g. "Interview"); if omitted, appends to first sheet.
 */
export async function appendToSheet(
  sheetId: string,
  keyJsonString: string,
  headers: string[],
  rows: Record<string, unknown>[],
  sheetName?: string
): Promise<{ updatedRows: number }> {
  const keyJson = JSON.parse(keyJsonString) as ServiceAccountKey
  if (!keyJson.client_email || !keyJson.private_key) {
    throw new Error("Invalid service account key: missing client_email or private_key")
  }
  const token = await getAccessToken(keyJson)
  const values = [headers, ...rows.map((row) => headers.map((h) => String(row[h] ?? "")))]
  const res = await fetch(SHEETS_APPEND(sheetId, sheetName), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets append error: ${res.status} ${err}`)
  }
  return { updatedRows: values.length }
}
