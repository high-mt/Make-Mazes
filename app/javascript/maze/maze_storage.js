// storage
export const MAZE_PREVIEW_STORAGE_KEY = "mazePreviewPayload"
export const MAZE_EDITOR_STORAGE_KEY = "mazeEditorState"

export const saveMazeEditorState = (editorState = null) => {
  if (!editorState) return false

  try {
    sessionStorage.setItem(MAZE_EDITOR_STORAGE_KEY, JSON.stringify(editorState))
    return true
  } catch (error) {
    console.error("Failed to save maze editor state:", error)
    return false
  }
}

export const loadMazeEditorState = () => {
  try {
    const raw = sessionStorage.getItem(MAZE_EDITOR_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error("Failed to load maze editor state:", error)
    return null
  }
}

export const clearMazeEditorState = () => {
  try {
    sessionStorage.removeItem(MAZE_EDITOR_STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear maze editor state:", error)
  }
}

export const saveMazePreviewPayload = (payload = null) => {
  if (!payload) return false

  try {
    sessionStorage.setItem(MAZE_PREVIEW_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch (error) {
    console.error("Failed to save maze preview payload:", error)
    return false
  }
}

export const loadMazePreviewPayload = () => {
  try {
    const raw = sessionStorage.getItem(MAZE_PREVIEW_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error("Failed to load maze preview payload:", error)
    return null
  }
}
