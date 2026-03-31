// storage
export const MAZE_PREVIEW_STORAGE_KEY = "mazePreviewPayload"
export const MAZE_EDITOR_STORAGE_KEY = "mazeEditorState"

const STORAGE_SCHEMA_VERSION = 1
const MAZE_STORAGE_TTL_MINUTES = 30
const MAZE_STORAGE_TTL_MS = MAZE_STORAGE_TTL_MINUTES * 60 * 1000

const STORAGE_TTL_BY_KEY = {
  [MAZE_EDITOR_STORAGE_KEY]: MAZE_STORAGE_TTL_MS,
  [MAZE_PREVIEW_STORAGE_KEY]: MAZE_STORAGE_TTL_MS
}

const buildStorageEnvelope = (storageKey, data) => {
  const ttlMs = STORAGE_TTL_BY_KEY[storageKey] || MAZE_STORAGE_TTL_MS
  const savedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()

  return {
    version: STORAGE_SCHEMA_VERSION,
    savedAt,
    expiresAt,
    data
  }
}

const isStorageEnvelope = (value) => {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "data" in value &&
    "savedAt" in value &&
    "expiresAt" in value
  )
}

const clearStorageItem = (storageKey) => {
  try {
    sessionStorage.removeItem(storageKey)
  } catch (error) {
    console.error(`Failed to clear storage item: ${storageKey}`, error)
  }
}

const saveStorageItem = (storageKey, data, errorLabel = "storage item") => {
  if (!data) return false

  try {
    const envelope = buildStorageEnvelope(storageKey, data)
    sessionStorage.setItem(storageKey, JSON.stringify(envelope))
    return true
  } catch (error) {
    console.error(`Failed to save ${errorLabel}:`, error)
    return false
  }
}

const loadStorageItem = (storageKey, errorLabel = "storage item") => {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw)

    // 旧形式データはそのまま返す
    if (!isStorageEnvelope(parsed)) {
      return parsed
    }

    const expiresAtTime = Date.parse(parsed.expiresAt)

    if (!Number.isFinite(expiresAtTime) || Date.now() > expiresAtTime) {
      clearStorageItem(storageKey)
      return null
    }

    return parsed.data ?? null
  } catch (error) {
    console.error(`Failed to load ${errorLabel}:`, error)
    return null
  }
}

export const saveMazeEditorState = (editorState = null) => {
  return saveStorageItem(
    MAZE_EDITOR_STORAGE_KEY,
    editorState,
    "maze editor state"
  )
}

export const loadMazeEditorState = () => {
  return loadStorageItem(
    MAZE_EDITOR_STORAGE_KEY,
    "maze editor state"
  )
}

export const clearMazeEditorState = () => {
  clearStorageItem(MAZE_EDITOR_STORAGE_KEY)
}

export const saveMazePreviewPayload = (payload = null) => {
  return saveStorageItem(
    MAZE_PREVIEW_STORAGE_KEY,
    payload,
    "maze preview payload"
  )
}

export const loadMazePreviewPayload = () => {
  return loadStorageItem(
    MAZE_PREVIEW_STORAGE_KEY,
    "maze preview payload"
  )
}