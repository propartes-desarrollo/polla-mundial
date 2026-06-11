import { sign, verify } from 'hono/jwt'

export interface JwtUser {
  id: string
  role: string
  name: string
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function createToken(user: JwtUser, secret: string): Promise<string> {
  const payload = {
    id: user.id,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }
  return sign(payload, secret, 'HS256')
}

export async function verifyToken(token: string, secret: string): Promise<JwtUser | null> {
  try {
    const p = await verify(token, secret, 'HS256')
    return { id: String(p.id), role: String(p.role), name: String(p.name) }
  } catch {
    return null
  }
}

// --- Password hashing (Web Crypto PBKDF2; bcrypt isn't available in Workers) ---

const PBKDF2_ITERATIONS = 100_000

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  )
  return toBase64(new Uint8Array(bits))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt)
  return `pbkdf2$${toBase64(salt)}$${hash}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Legacy plaintext fallback (e.g. the seeded admin "admin123").
  // Lets the initial admin log in; new accounts always store a pbkdf2$ hash.
  if (!stored.startsWith('pbkdf2$')) {
    return password === stored
  }
  const [, saltStr, hashStr] = stored.split('$')
  const hash = await derive(password, fromBase64(saltStr))
  return hash === hashStr
}
