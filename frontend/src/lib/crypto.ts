// Simple Web Crypto helpers: PBKDF2 key derivation and AES-GCM encrypt/decrypt

export function randomBytes(len = 12): Uint8Array {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return arr
}

export async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 210000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptJSON(key: CryptoKey, data: unknown): Promise<{ iv: string; ciphertext: string }>{
  const iv = randomBytes(12)
  const pt = new TextEncoder().encode(JSON.stringify(data))
  // Copy into a fresh ArrayBuffer (avoids SharedArrayBuffer typing issues)
  const ptBuf = new ArrayBuffer(pt.byteLength)
  new Uint8Array(ptBuf).set(pt)
  const ivBuf = new ArrayBuffer(iv.byteLength)
  new Uint8Array(ivBuf).set(iv)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, key, ptBuf))
  // For convenience store base64 strings
  return {
    iv: b64(iv),
    ciphertext: b64(ct),
  }
}

export async function decryptJSON<T = unknown>(key: CryptoKey, enc: { iv: string; ciphertext: string }): Promise<T> {
  const iv = ub64(enc.iv)
  const ct = ub64(enc.ciphertext)
  const ctBuf = new ArrayBuffer(ct.byteLength)
  new Uint8Array(ctBuf).set(ct)
  const ivBuf = new ArrayBuffer(iv.byteLength)
  new Uint8Array(ivBuf).set(iv)
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, ctBuf))
  return JSON.parse(new TextDecoder().decode(pt)) as T
}

export function b64(data: Uint8Array): string {
  let str = ''
  data.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str)
}

export function ub64(text: string): Uint8Array {
  const bin = atob(text)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportRawKey(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  return b64(raw)
}

export async function importRawKey(b64raw: string): Promise<CryptoKey> {
  const raw = ub64(b64raw)
  const buf = new ArrayBuffer(raw.byteLength)
  new Uint8Array(buf).set(raw)
  return crypto.subtle.importKey('raw', buf, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

export async function wrapKey(master: CryptoKey, key: CryptoKey): Promise<{ iv: string; wrapped: string }> {
  const iv = randomBytes(12)
  const rawB64 = await exportRawKey(key)
  const pt = new TextEncoder().encode(rawB64)
  const ptBuf = new ArrayBuffer(pt.byteLength)
  new Uint8Array(ptBuf).set(pt)
  const ivBuf = new ArrayBuffer(iv.byteLength)
  new Uint8Array(ivBuf).set(iv)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, master, ptBuf))
  return { iv: b64(iv), wrapped: b64(ct) }
}

export async function unwrapKey(master: CryptoKey, wrapped: { iv: string; wrapped: string }): Promise<CryptoKey> {
  const iv = ub64(wrapped.iv)
  const ct = ub64(wrapped.wrapped)
  const ivBuf = new ArrayBuffer(iv.byteLength)
  new Uint8Array(ivBuf).set(iv)
  const ctBuf = new ArrayBuffer(ct.byteLength)
  new Uint8Array(ctBuf).set(ct)
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, master, ctBuf))
  const rawB64 = new TextDecoder().decode(pt)
  return importRawKey(rawB64)
}
