import { deriveKey, randomBytes, wrapKey, unwrapKey, generateAesKey, b64, ub64, encryptJSON, decryptJSON } from './crypto'
import { db } from './db'

let cachedMaster: CryptoKey | null = null

function getOrCreateSalt(): ArrayBuffer {
  let s = localStorage.getItem('master_salt')
  if (!s) {
    const rb = randomBytes(16)
    s = b64(rb)
    localStorage.setItem('master_salt', s)
  }
  const u = ub64(s)
  const buf = new ArrayBuffer(u.byteLength)
  new Uint8Array(buf).set(u)
  return buf
}

export function hasMasterKey(): boolean {
  // Consider an active session passphrase as sufficient to unlock routes.
  // The actual CryptoKey will be lazily derived by getMasterKey().
  return !!cachedMaster || !!sessionStorage.getItem('session_passphrase')
}

export async function setPassphrase(pass: string, rememberSession = false, hint?: string): Promise<void> {
  const salt = getOrCreateSalt()
  cachedMaster = await deriveKey(pass, salt)
  if (rememberSession) sessionStorage.setItem('session_passphrase', pass)
  if (hint) localStorage.setItem('passphrase_hint', hint)
}

export async function getMasterKey(): Promise<CryptoKey> {
  if (!cachedMaster) {
    const sess = sessionStorage.getItem('session_passphrase')
    if (sess) {
      const salt = getOrCreateSalt()
      cachedMaster = await deriveKey(sess, salt)
    }
  }
  if (!cachedMaster) throw new Error('Master key not initialized')
  return cachedMaster
}

export async function getDocKey(doc_id: string): Promise<CryptoKey> {
  const existing = await db.keys.get(doc_id)
  const master = await getMasterKey()
  if (existing) {
    return unwrapKey(master, JSON.parse(existing.wrapped))
  }
  const key = await generateAesKey()
  const wrapped = await wrapKey(master, key)
  await db.keys.put({ doc_id, wrapped: JSON.stringify(wrapped) })
  return key
}

// Change the passphrase used to derive the master key.
// This keeps the same salt but re-wraps all stored document keys with the new master.
export async function changePassphrase(oldPass: string, newPass: string, rememberSession = false, hint?: string): Promise<void> {
  const salt = getOrCreateSalt()

  // Derive the old master from the provided old passphrase to verify it.
  const oldMaster = await deriveKey(oldPass, salt)

  // Load all existing wrapped keys using the old master to ensure the passphrase is correct.
  const all = await db.keys.toArray()
  try {
    for (const row of all) {
      const wrapped = JSON.parse(row.wrapped)
      await unwrapKey(oldMaster, wrapped)
    }
  } catch {
    throw new Error('Incorrect current passphrase')
  }

  // Derive the new master and re-wrap all keys.
  const newMaster = await deriveKey(newPass, salt)

  for (const row of all) {
    const wrappedOld = JSON.parse(row.wrapped)
    const key = await unwrapKey(oldMaster, wrappedOld)
    const wrappedNew = await wrapKey(newMaster, key)
    await db.keys.put({ doc_id: row.doc_id, wrapped: JSON.stringify(wrappedNew) })
  }

  cachedMaster = newMaster
  sessionStorage.removeItem('session_passphrase')
  if (rememberSession) sessionStorage.setItem('session_passphrase', newPass)
  if (hint) localStorage.setItem('passphrase_hint', hint)
}

export function getPassphraseHint(): string | null {
  return localStorage.getItem('passphrase_hint')
}

// Key bundle export/import (encrypted with user-provided backup password)
export async function exportKeyBundle(backupPassword: string): Promise<Blob> {
  const keys = await db.keys.toArray()
  const bundle = {
    version: 1,
    master_salt: localStorage.getItem('master_salt'),
    keys,
    createdAt: Date.now(),
  }
  // derive a key from backupPassword with a fresh salt
  const salt = (() => {
    const rb = randomBytes(16)
    const buf = new ArrayBuffer(rb.byteLength)
    new Uint8Array(buf).set(rb)
    return buf
  })()
  const k = await deriveKey(backupPassword, salt)
  const encrypted = await encryptJSON(k, bundle)
  const payload = { s: b64(new Uint8Array(salt)), e: encrypted }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

export async function importKeyBundle(file: File, backupPassword: string): Promise<void> {
  const text = await file.text()
  const pkg = JSON.parse(text)
  const saltB = ub64(pkg.s)
  const saltBuf = new ArrayBuffer(saltB.byteLength)
  new Uint8Array(saltBuf).set(saltB)
  const k = await deriveKey(backupPassword, saltBuf)
  const bundle = await decryptJSON<any>(k, pkg.e)
  if (!bundle?.keys) throw new Error('Invalid backup')
  if (bundle.master_salt) localStorage.setItem('master_salt', bundle.master_salt)
  for (const row of bundle.keys) {
    await db.keys.put(row)
  }
}
