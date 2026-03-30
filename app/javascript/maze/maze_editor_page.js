// editor 本体 + preview payload 生成 + maze generation + SVG組み立て
import {
  clearMazeEditorState,
  loadMazeEditorState,
  saveMazeEditorState,
  saveMazePreviewPayload
} from "maze/maze_storage"

import { createMazeGenerator } from "maze/maze_generator"
import { createMazeRenderer } from "maze/maze_renderer"

const MAZE_SIDE_CLASSES = [
  "is-open-top",
  "is-open-bottom",
  "is-open-left",
  "is-open-right"
]

const ANSWER_PREVIEW_CONFIG = {
  cellSize: 22,
  wallThickness: 2,
  strokeColor: "#0f172a",
  backgroundColor: "#ffffff",
  padding: 72,
  routeOverlayColor: "#ffaabb",
  routeOverlayClass: "maze-answer-route-overlay",
  routeOverlayInset: 5,
  routeOverlayOpacity: 0.95,
  routeEndpointRadius: 10,
  frameLabelColor: "#334155",
  frameLabelFontSize: 18,
  frameLabelFontWeight: 700,
  frameLabelOffset: 18
}

export const initMazeEditorPage = () => {
  const root = document.querySelector("[data-maze-entry-exit-root]")
  if (!root || root.dataset.mazeEntryExitInitialized === "true") return

  root.dataset.mazeEntryExitInitialized = "true"

  const rows = Number(root.dataset.mazeRows)
  const cols = Number(root.dataset.mazeCols)
  const grid = root.querySelector("[data-maze-grid]")
  const modeLabel = root.querySelector("[data-maze-mode-label]")
  const routeStatusLabel = root.querySelector("[data-maze-route-status]")
  const routeCountLabel = root.querySelector("[data-maze-route-count]")
  const finalizedStatusLabel = root.querySelector("[data-maze-finalized-status]")
  const finalizedJsonPreview = root.querySelector("[data-maze-finalized-json]")
  const generatorStatusLabel = root.querySelector("[data-maze-generator-status]")
  const generatorJsonPreview = root.querySelector("[data-maze-generator-json]")
  const copyFinalizedJsonButton = root.querySelector("[data-copy-finalized-json]")
  const copyGeneratorJsonButton = root.querySelector("[data-copy-generator-json]")
  const gridWrapper = root.querySelector(".maze-grid-wrapper")
  const entryBadge = root.querySelector("[data-maze-entry-badge]")
  const exitBadge = root.querySelector("[data-maze-exit-badge]")
  const clearRouteButton = root.querySelector("[data-maze-clear-route]")
  const undoRouteButton = root.querySelector("[data-maze-undo-route]")
  const undoStrokeButton = root.querySelector("[data-maze-undo-stroke]")
  const redoRouteButton = root.querySelector("[data-maze-redo-route]")
  const allClearButton = root.querySelector("[data-maze-all-clear]")
  const generateButton = root.querySelector("[data-maze-generate]")
  const previewButton = root.querySelector("[data-maze-preview]")
  const resetGeneratedButton = root.querySelector("[data-maze-reset-generated]")
  const previewPath = root.dataset.mazePreviewPath
  const mazeTitleToggle = root.querySelector("#use-maze-title")
  const mazeTitleInput = root.querySelector("#maze-title")
  const mazeCommentToggle = root.querySelector("#use-maze-comment")
  const mazeCommentInput = root.querySelector("#maze-comment")
  const solverImpressionToggle = root.querySelector("#use-solver-impression")
  const modeButtons = root.querySelectorAll(".js-maze-mode-button")
  const drawModeButton = root.querySelector('[data-maze-mode="draw"]')
  const entryModeButton = root.querySelector('[data-maze-mode="entry"]')
  const exitModeButton = root.querySelector('[data-maze-mode="exit"]')

  if (!grid || !gridWrapper || !modeLabel || modeButtons.length === 0) return

  const SELECTION_TAP_MOVE_THRESHOLD = 10

  const state = {
    mode: "entry",
    previewKey: null,
    entry: null,
    exit: null,
    isDrawing: false,
    hasRouteStarted: false,
    isRouteComplete: false,
    routeCells: [],
    routeStrokes: [],
    currentStroke: [],
    redoStack: [],
    hasGeneratedMaze: false,
    // selectionPointer.typeは未使用（削除推奨）
    selectionPointer: {
      id: null,
      type: null,
      startX: 0,
      startY: 0,
      didMove: false
    }
  }

  const {
    buildDirectionBetween,
    getOppositeDirection,
    buildMazeGeneratorInput,
    buildFinalizedJsonCheckpoint,
    buildGeneratorJsonCheckpoint
  } = createMazeGenerator({ rows, cols })

  const cellKey = (row, col) => `${row}-${col}`

  const { buildPreviewPayload } = createMazeRenderer({
    cellKey,
    buildDirectionBetween,
    getOppositeDirection,
    previewConfig: ANSWER_PREVIEW_CONFIG
  })

  const cloneRouteCells = (routeCells = []) => {
    return routeCells.map((routeCell) => ({ ...routeCell }))
  }

  const cloneRedoAction = (action) => {
    if (!action) return null

    return {
      ...action,
      cells: cloneRouteCells(action.cells || [])
    }
  }

  const findCell = (row, col) => {
    return grid.querySelector(`.maze-cell[data-row="${row}"][data-col="${col}"]`)
  }

  const clearSideClasses = (cell) => {
    MAZE_SIDE_CLASSES.forEach((className) => {
      cell.classList.remove(className)
    })
  }

  const isEntryExitReady = () => {
    return Boolean(state.entry && state.exit)
  }

  const canEditEntryExit = () => {
    return !state.hasRouteStarted && !state.isDrawing
  }

  const goToPreview = (kind = "question") => {
    if (!previewPath) return

    const url = new URL(previewPath, window.location.origin)
    url.searchParams.set("kind", kind)

    window.location.href = url.toString()
  }

  const getRouteEndCell = () => {
    return state.routeCells[state.routeCells.length - 1] || null
  }

  const getLastStroke = () => {
    return state.routeStrokes[state.routeStrokes.length - 1] || null
  }

  const buildPersistedEditorState = () => {
    return {
      mode: state.mode,
      entry: state.entry,
      exit: state.exit,
      routeCells: cloneRouteCells(state.routeCells),
      routeStrokes: state.routeStrokes.map((stroke) => cloneRouteCells(stroke)),
      redoStack: state.redoStack.map((action) => cloneRedoAction(action)),
      hasRouteStarted: state.hasRouteStarted,
      isRouteComplete: state.isRouteComplete,
      hasGeneratedMaze: state.hasGeneratedMaze,
      finalizedMazeInput: root.dataset.finalizedMazeInput || null,
      printOptions: {
        useMazeTitle: Boolean(mazeTitleToggle?.checked),
        mazeTitle: mazeTitleInput?.value || "",
        useMazeComment: Boolean(mazeCommentToggle?.checked),
        mazeComment: mazeCommentInput?.value || "",
        useSolverImpression: Boolean(solverImpressionToggle?.checked)
      }
    }
  }

  const persistMazeEditorState = () => {
    try {
      const saved = saveMazeEditorState(buildPersistedEditorState())

      if (saved === false) {
        console.warn("[maze_editor_page] Failed to persist editor state.")
      }

      return saved
    } catch (error) {
      console.warn("[maze_editor_page] Failed to persist editor state:", error)
      return false
    }
  }

  const getCellInfo = (cell) => {
    const row = Number(cell.dataset.row)
    const col = Number(cell.dataset.col)

    const isTop = row === 0
    const isBottom = row === rows - 1
    const isLeft = col === 0
    const isRight = col === cols - 1

    const isPerimeter = isTop || isBottom || isLeft || isRight
    const isCorner = (isTop || isBottom) && (isLeft || isRight)

    if (!isPerimeter) {
      return {
        row,
        col,
        isPerimeter: false,
        isCorner: false,
        side: null,
        index: null,
        sideClass: null
      }
    }

    if (isCorner) {
      return {
        row,
        col,
        isPerimeter: true,
        isCorner: true,
        side: null,
        index: null,
        sideClass: null
      }
    }

    if (isTop) {
      return {
        row,
        col,
        isPerimeter: true,
        isCorner: false,
        side: "top",
        index: col,
        sideClass: "is-open-top"
      }
    }

    if (isBottom) {
      return {
        row,
        col,
        isPerimeter: true,
        isCorner: false,
        side: "bottom",
        index: col,
        sideClass: "is-open-bottom"
      }
    }

    if (isLeft) {
      return {
        row,
        col,
        isPerimeter: true,
        isCorner: false,
        side: "left",
        index: row,
        sideClass: "is-open-left"
      }
    }

    return {
      row,
      col,
      isPerimeter: true,
      isCorner: false,
      side: "right",
      index: row,
      sideClass: "is-open-right"
    }
  }

  const buildSelection = (cell) => {
    const info = getCellInfo(cell)
    if (!info.isPerimeter || info.isCorner) return null

    return {
      key: cellKey(info.row, info.col),
      row: info.row,
      col: info.col,
      side: info.side,
      index: info.index,
      sideClass: info.sideClass
    }
  }

  const buildRouteCell = (cell) => {
    const row = Number(cell.dataset.row)
    const col = Number(cell.dataset.col)

    return {
      key: cellKey(row, col),
      row,
      col
    }
  }

  const buildRouteCellFromPosition = (row, col) => {
    return {
      key: cellKey(row, col),
      row,
      col
    }
  }

  const serializeSelection = (selection) => {
    if (!selection) return null

    return {
      row: selection.row,
      col: selection.col,
      side: selection.side,
      index: selection.index
    }
  }

  const serializeRouteCells = (routeCells = []) => {
    return routeCells.map((routeCell) => ({
      row: routeCell.row,
      col: routeCell.col
    }))
  }

  const buildFinalizedMazeInput = () => {
    if (!state.isRouteComplete || !state.entry || !state.exit || state.routeCells.length === 0) {
      return null
    }

    return {
      entry: serializeSelection(state.entry),
      exit: serializeSelection(state.exit),
      routeCells: serializeRouteCells(state.routeCells),
      rows,
      cols,
      routeCompleted: true,
      routeCellCount: state.routeCells.length
    }
  }

  const updateJsonCopyButtonState = (button, isReady = false) => {
    if (!button) return
    button.disabled = !isReady
  }

  const fallbackCopyText = (text = "") => {
    if (!text) return false

    try {
      const tempTextarea = document.createElement("textarea")
      tempTextarea.value = text
      tempTextarea.setAttribute("readonly", "")
      tempTextarea.style.position = "fixed"
      tempTextarea.style.top = "0"
      tempTextarea.style.left = "-9999px"
      tempTextarea.style.opacity = "0"

      document.body.appendChild(tempTextarea)
      tempTextarea.focus()
      tempTextarea.select()
      tempTextarea.setSelectionRange(0, tempTextarea.value.length)

      const copied = document.execCommand("copy")
      document.body.removeChild(tempTextarea)

      return copied
    } catch (error) {
      return false
    }
  }

  const copyTextToClipboard = async (text = "") => {
    if (!text) return false

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (error) {
        return fallbackCopyText(text)
      }
    }

    return fallbackCopyText(text)
  }

  const showJsonCopyButtonFeedback = (button, label = "コピー済み") => {
    if (!button) return

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent.trim()
    }

    if (button.copyFeedbackTimer) {
      window.clearTimeout(button.copyFeedbackTimer)
    }

    button.textContent = label

    button.copyFeedbackTimer = window.setTimeout(() => {
      button.textContent = button.dataset.defaultLabel || "コピー"
    }, 1200)
  }

  const syncJsonCopyButtonsState = () => {
    updateJsonCopyButtonState(
      copyFinalizedJsonButton,
      Boolean(root.dataset.finalizedMazeInput)
    )

    updateJsonCopyButtonState(
      copyGeneratorJsonButton,
      Boolean(root.dataset.mazeGeneratorInput)
    )
  }

  const bindJsonCopyButtons = () => {
    if (
      copyFinalizedJsonButton &&
      copyFinalizedJsonButton.dataset.copyInitialized !== "true"
    ) {
      copyFinalizedJsonButton.dataset.copyInitialized = "true"
      copyFinalizedJsonButton.dataset.defaultLabel = copyFinalizedJsonButton.textContent.trim()

      copyFinalizedJsonButton.addEventListener("click", async () => {
        const text = root.dataset.finalizedMazeInput || ""

        if (!text) {
          showJsonCopyButtonFeedback(copyFinalizedJsonButton, "未確定")
          return
        }

        const copied = await copyTextToClipboard(text)
        showJsonCopyButtonFeedback(
          copyFinalizedJsonButton,
          copied ? "コピー済み" : "失敗"
        )
      })
    }

    if (
      copyGeneratorJsonButton &&
      copyGeneratorJsonButton.dataset.copyInitialized !== "true"
    ) {
      copyGeneratorJsonButton.dataset.copyInitialized = "true"
      copyGeneratorJsonButton.dataset.defaultLabel = copyGeneratorJsonButton.textContent.trim()

      copyGeneratorJsonButton.addEventListener("click", async () => {
        const text = root.dataset.mazeGeneratorInput || ""

        if (!text) {
          showJsonCopyButtonFeedback(copyGeneratorJsonButton, "未生成")
          return
        }

        const copied = await copyTextToClipboard(text)
        showJsonCopyButtonFeedback(
          copyGeneratorJsonButton,
          copied ? "コピー済み" : "失敗"
        )
      })
    }
  }

  const clearGeneratedMazeInput = () => {
    delete root.dataset.mazeGeneratorInput
    delete root.dataset.previewReady
    root.dataset.generatorReady = "false"
    state.hasGeneratedMaze = false

    if (generatorStatusLabel) {
      generatorStatusLabel.textContent = "未生成"
    }

    if (generatorJsonPreview) {
      generatorJsonPreview.textContent = "未生成"
    }

    syncJsonCopyButtonsState()
  }

  const syncMazeGeneratorInput = (mazeGeneratorInput = null) => {
    if (mazeGeneratorInput) {
      root.dataset.mazeGeneratorInput = JSON.stringify(mazeGeneratorInput)
      root.dataset.generatorReady = "true"
      root.dataset.previewReady = "true"
      state.hasGeneratedMaze = true
    } else {
      delete root.dataset.mazeGeneratorInput
      delete root.dataset.previewReady
      root.dataset.generatorReady = "false"
      state.hasGeneratedMaze = false
    }

    if (generatorStatusLabel) {
      generatorStatusLabel.textContent = mazeGeneratorInput ? "生成済み" : "未生成"
    }

    if (generatorJsonPreview) {
      const generatorJsonCheckpoint = buildGeneratorJsonCheckpoint(mazeGeneratorInput)

      generatorJsonPreview.textContent = generatorJsonCheckpoint
        ? JSON.stringify(generatorJsonCheckpoint, null, 2)
        : "未生成"
    }

    syncJsonCopyButtonsState()
    persistMazeEditorState()
  }

  const syncFinalizedMazeInput = () => {
    const finalizedMazeInput = buildFinalizedMazeInput()

    if (finalizedMazeInput) {
      root.dataset.finalizedMazeInput = JSON.stringify(finalizedMazeInput)
    } else {
      delete root.dataset.finalizedMazeInput
    }

    root.dataset.finalizedReady = String(Boolean(finalizedMazeInput))

    if (finalizedStatusLabel) {
      finalizedStatusLabel.textContent = finalizedMazeInput ? "確定済み" : "未確定"
    }

    if (finalizedJsonPreview) {
      const finalizedJsonCheckpoint = buildFinalizedJsonCheckpoint(finalizedMazeInput)

      finalizedJsonPreview.textContent = finalizedJsonCheckpoint
        ? JSON.stringify(finalizedJsonCheckpoint, null, 2)
        : "未確定"
    }

    if (!finalizedMazeInput) {
      clearGeneratedMazeInput()
    }

    syncJsonCopyButtonsState()
    persistMazeEditorState()
  }

  const addRouteCellVisual = (routeCell) => {
    const cell = findCell(routeCell.row, routeCell.col)
    if (cell) {
      cell.classList.add("is-route-cell")
    }
  }

  const removeRouteCellVisual = (routeCell) => {
    const cell = findCell(routeCell.row, routeCell.col)
    if (cell) {
      cell.classList.remove("is-route-cell", "is-route-tail")
    }
  }

  const appendRouteCell = (routeCell, targetStroke = null) => {
    const lastRouteCell = state.routeCells[state.routeCells.length - 1]
    if (lastRouteCell?.key === routeCell.key) return false

    const routeCellCopy = { ...routeCell }
    state.routeCells.push(routeCellCopy)

    if (targetStroke) {
      targetStroke.push({ ...routeCellCopy })
    }

    addRouteCellVisual(routeCellCopy)
    return true
  }

  const removeLastRouteCell = () => {
    const removedRouteCell = state.routeCells.pop()
    if (!removedRouteCell) return null

    removeRouteCellVisual(removedRouteCell)
    return removedRouteCell
  }

  const buildInterpolatedRouteCells = (fromRouteCell, toRouteCell) => {
    if (!fromRouteCell) return [toRouteCell]

    const interpolatedCells = []

    let currentRow = fromRouteCell.row
    let currentCol = fromRouteCell.col

    const targetRow = toRouteCell.row
    const targetCol = toRouteCell.col

    while (currentRow !== targetRow || currentCol !== targetCol) {
      const rowDiff = targetRow - currentRow
      const colDiff = targetCol - currentCol

      if (Math.abs(rowDiff) >= Math.abs(colDiff) && rowDiff !== 0) {
        currentRow += Math.sign(rowDiff)
      } else if (colDiff !== 0) {
        currentCol += Math.sign(colDiff)
      }

      interpolatedCells.push(
        buildRouteCellFromPosition(currentRow, currentCol)
      )
    }

    return interpolatedCells
  }

  const markCellTypes = () => {
    grid.querySelectorAll(".maze-cell").forEach((cell) => {
      const info = getCellInfo(cell)

      if (info.isPerimeter) {
        cell.classList.add("is-perimeter")
      }

      if (info.isCorner) {
        cell.classList.add("is-corner")
      }
    })
  }

  const syncEntryExitDataset = () => {
    if (state.entry) {
      root.dataset.entryRow = String(state.entry.row)
      root.dataset.entryCol = String(state.entry.col)
      root.dataset.entrySide = state.entry.side
      root.dataset.entryIndex = String(state.entry.index)
    } else {
      delete root.dataset.entryRow
      delete root.dataset.entryCol
      delete root.dataset.entrySide
      delete root.dataset.entryIndex
    }

    if (state.exit) {
      root.dataset.exitRow = String(state.exit.row)
      root.dataset.exitCol = String(state.exit.col)
      root.dataset.exitSide = state.exit.side
      root.dataset.exitIndex = String(state.exit.index)
    } else {
      delete root.dataset.exitRow
      delete root.dataset.exitCol
      delete root.dataset.exitSide
      delete root.dataset.exitIndex
    }
    // 調整確認
    persistMazeEditorState()
  }

  const updateRouteCompletion = () => {
    const lastRouteCell = getRouteEndCell()
    state.isRouteComplete = Boolean(
      state.exit &&
      lastRouteCell &&
      lastRouteCell.key === state.exit.key
    )
  }

  const syncRouteTailVisual = () => {
    grid.querySelectorAll(".maze-cell.is-route-tail").forEach((cell) => {
      cell.classList.remove("is-route-tail")
    })

    if (state.isRouteComplete) return

    const lastRouteCell = getRouteEndCell()
    if (!lastRouteCell) return

    const tailCell = findCell(lastRouteCell.row, lastRouteCell.col)
    if (tailCell) {
      tailCell.classList.add("is-route-tail")
    }
  }

  const syncRouteDataset = ({ preserveGeneratedMaze = false } = {}) => {
    updateRouteCompletion()
    syncRouteTailVisual()

    root.dataset.routeCells = JSON.stringify(state.routeCells)
    root.dataset.routeCellCount = String(state.routeCells.length)
    root.dataset.routeCompleted = String(state.isRouteComplete)

    if (routeCountLabel) {
      routeCountLabel.textContent = String(state.routeCells.length)
    }

    if (routeStatusLabel) {
      let routeStatusText = "入口・出口待ち"

      if (isEntryExitReady()) {
        if (state.isRouteComplete) {
          routeStatusText = "完成"
        } else if (state.routeCells.length === 0) {
          routeStatusText = "未着手"
        } else {
          routeStatusText = "描画中"
        }
      }

      routeStatusLabel.textContent = routeStatusText
    }

    if (!state.isDrawing && !preserveGeneratedMaze) {
      clearGeneratedMazeInput()
    }

    syncFinalizedMazeInput()
    persistMazeEditorState()
  }

  const hideBadge = (badge) => {
    if (!badge) return

    badge.classList.add("is-hidden")
    badge.removeAttribute("data-side")
    badge.style.left = ""
    badge.style.top = ""
  }

  const positionBadge = (badge, selection) => {
    if (!badge || !selection) {
      hideBadge(badge)
      return
    }

    const cell = findCell(selection.row, selection.col)
    if (!cell) {
      hideBadge(badge)
      return
    }

    const wrapperRect = gridWrapper.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()

    const cellLeft = cellRect.left - wrapperRect.left
    const cellTop = cellRect.top - wrapperRect.top
    const cellCenterX = cellLeft + cellRect.width / 2
    const cellCenterY = cellTop + cellRect.height / 2
    const badgeOffset = window.matchMedia("(max-width: 639px)").matches ? 14 : 10

    badge.classList.remove("is-hidden")
    badge.dataset.side = selection.side

    if (selection.side === "top") {
      badge.style.left = `${cellCenterX}px`
      badge.style.top = `${cellTop - badgeOffset}px`
      return
    }

    if (selection.side === "bottom") {
      badge.style.left = `${cellCenterX}px`
      badge.style.top = `${cellTop + cellRect.height + badgeOffset}px`
      return
    }

    if (selection.side === "left") {
      badge.style.left = `${cellLeft - badgeOffset}px`
      badge.style.top = `${cellCenterY}px`
      return
    }

    badge.style.left = `${cellLeft + cellRect.width + badgeOffset}px`
    badge.style.top = `${cellCenterY}px`
  }

  const updateBadges = () => {
    positionBadge(entryBadge, state.entry)
    positionBadge(exitBadge, state.exit)
  }

  const rebuildMazeGeneratorInputFromPersistedState = (persisted = null) => {
    if (!persisted?.hasGeneratedMaze || !persisted?.finalizedMazeInput) {
      return null
    }

    try {
      const finalizedMazeInput = JSON.parse(persisted.finalizedMazeInput)
      return buildMazeGeneratorInput(finalizedMazeInput)
    } catch (error) {
      console.warn("[maze_editor_page] Failed to rebuild maze generator input:", error)
      return null
    }
  }

  const restorePersistedEditorState = () => {
    const persisted = loadMazeEditorState()
    if (!persisted) return

    state.mode = persisted.mode || "entry"
    state.entry = persisted.entry || null
    state.exit = persisted.exit || null
    state.routeCells = cloneRouteCells(persisted.routeCells || [])
    state.routeStrokes = (persisted.routeStrokes || []).map((stroke) => cloneRouteCells(stroke))
    state.redoStack = (persisted.redoStack || []).map((action) => cloneRedoAction(action))
    state.hasRouteStarted = Boolean(persisted.hasRouteStarted)
    state.isRouteComplete = Boolean(persisted.isRouteComplete)
    state.hasGeneratedMaze = Boolean(persisted.hasGeneratedMaze)
    state.currentStroke = []

    let finalizedPreview = null

    if (persisted.finalizedMazeInput) {
      try {
        finalizedPreview = JSON.parse(persisted.finalizedMazeInput)
        root.dataset.finalizedMazeInput = persisted.finalizedMazeInput
      } catch (error) {
        console.warn("[maze_editor_page] Failed to parse finalized maze input:", error)
        finalizedPreview = null
        delete root.dataset.finalizedMazeInput
      }
    } else {
      delete root.dataset.finalizedMazeInput
    }

    const restoredMazeGeneratorInput = rebuildMazeGeneratorInputFromPersistedState(persisted)

    if (restoredMazeGeneratorInput) {
      root.dataset.mazeGeneratorInput = JSON.stringify(restoredMazeGeneratorInput)
      root.dataset.generatorReady = "true"
      root.dataset.previewReady = "true"
      state.hasGeneratedMaze = true
    } else {
      delete root.dataset.mazeGeneratorInput
      root.dataset.generatorReady = "false"
      delete root.dataset.previewReady

      if (persisted.hasGeneratedMaze && persisted.finalizedMazeInput) {
        console.warn("[maze_editor_page] Maze generator input could not be restored.")
      }

      state.hasGeneratedMaze = false
    }

    const persistedPrintOptions = persisted.printOptions || {}

    const syncCollapsibleField = ({ toggle, contentId, input, checked, value = "" }) => {
      if (!toggle) return

      const isChecked = Boolean(checked)
      toggle.checked = isChecked

      const content = contentId ? document.getElementById(contentId) : null
      if (content) {
        content.classList.toggle("is-open", isChecked)
      }

      if (input) {
        input.disabled = !isChecked
        input.value = isChecked ? value : ""
      }
    }

    syncCollapsibleField({
      toggle: mazeTitleToggle,
      contentId: "maze-title-content",
      input: mazeTitleInput,
      checked: persistedPrintOptions.useMazeTitle,
      value: persistedPrintOptions.mazeTitle || ""
    })

    syncCollapsibleField({
      toggle: mazeCommentToggle,
      contentId: "maze-comment-content",
      input: mazeCommentInput,
      checked: persistedPrintOptions.useMazeComment,
      value: persistedPrintOptions.mazeComment || ""
    })

    if (solverImpressionToggle) {
      solverImpressionToggle.checked = Boolean(persistedPrintOptions.useSolverImpression)
    }

    grid.querySelectorAll(".maze-cell").forEach((cell) => {
      cell.classList.remove(
        "is-preview",
        "is-entry-confirmed",
        "is-exit-confirmed",
        "is-route-cell",
        "is-route-tail"
      )
      clearSideClasses(cell)
    })

    if (state.entry) {
      const entryCell = findCell(state.entry.row, state.entry.col)
      if (entryCell) {
        entryCell.classList.add("is-entry-confirmed")
        entryCell.classList.add(state.entry.sideClass)
      }
    }

    if (state.exit) {
      const exitCell = findCell(state.exit.row, state.exit.col)
      if (exitCell) {
        exitCell.classList.add("is-exit-confirmed")
        exitCell.classList.add(state.exit.sideClass)
      }
    }

    state.routeCells.forEach((routeCell) => {
      addRouteCellVisual(routeCell)
    })

    syncRouteTailVisual()
    updateBadges()

    if (finalizedStatusLabel) {
      finalizedStatusLabel.textContent = finalizedPreview ? "確定済み" : "未確定"
    }

    if (finalizedJsonPreview) {
      finalizedJsonPreview.textContent = finalizedPreview
        ? JSON.stringify(buildFinalizedJsonCheckpoint(finalizedPreview), null, 2)
        : "未確定"
    }

    if (generatorStatusLabel) {
      generatorStatusLabel.textContent = restoredMazeGeneratorInput ? "生成済み" : "未生成"
    }

    if (generatorJsonPreview) {
      generatorJsonPreview.textContent = restoredMazeGeneratorInput
        ? JSON.stringify(buildGeneratorJsonCheckpoint(restoredMazeGeneratorInput), null, 2)
        : "未生成"
    }
  }

  const clearPreview = () => {
    if (!state.previewKey) return

    const [row, col] = state.previewKey.split("-").map(Number)
    const cell = findCell(row, col)

    if (cell) {
      cell.classList.remove("is-preview")

      const isEntryCell = state.entry?.key === state.previewKey
      const isExitCell = state.exit?.key === state.previewKey

      if (!isEntryCell && !isExitCell) {
        clearSideClasses(cell)
      }
    }

    state.previewKey = null
  }

  const refreshActionButtons = () => {
    const hasRouteCells = state.routeCells.length > 0
    const hasCommittedStrokes = state.routeStrokes.length > 0
    const shouldDisableUndoActions = state.isDrawing

    if (entryModeButton) {
      entryModeButton.disabled = !canEditEntryExit()
    }

    if (exitModeButton) {
      exitModeButton.disabled = !canEditEntryExit()
    }

    if (drawModeButton) {
      drawModeButton.disabled = !isEntryExitReady() || state.isRouteComplete
    }

    if (undoRouteButton) {
      undoRouteButton.disabled = !hasRouteCells || shouldDisableUndoActions
    }

    if (undoStrokeButton) {
      undoStrokeButton.disabled = !hasCommittedStrokes || shouldDisableUndoActions
    }

    if (redoRouteButton) {
      redoRouteButton.disabled = state.redoStack.length === 0 || shouldDisableUndoActions
    }

    if (clearRouteButton) {
      clearRouteButton.disabled = !hasRouteCells || shouldDisableUndoActions
    }

    if (allClearButton) {
      allClearButton.disabled = !(
        state.entry ||
        state.exit ||
        hasRouteCells ||
        state.hasRouteStarted
      ) || shouldDisableUndoActions
    }

    const canGenerateMaze = state.isRouteComplete && !state.hasGeneratedMaze
    const canPreviewMaze = state.hasGeneratedMaze
    const canResetGeneratedMaze = state.hasGeneratedMaze

    if (generateButton) {
      generateButton.disabled = !canGenerateMaze
    }

    if (previewButton) {
      previewButton.disabled = !canPreviewMaze
    }

    if (resetGeneratedButton) {
      resetGeneratedButton.disabled = !canResetGeneratedMaze
    }
  }

  const finalizeCurrentStroke = () => {
    if (state.currentStroke.length === 0) return

    state.routeStrokes.push(cloneRouteCells(state.currentStroke))
    state.currentStroke = []
  }

  const validateRouteSegment = (routeSegment) => {
    if (!routeSegment.length) {
      return false
    }

    if (state.isRouteComplete) {
      return false
    }

    const existingKeys = new Set(state.routeCells.map((routeCell) => routeCell.key))
    const segmentKeys = new Set()
    const exitKey = state.exit?.key
    let exitIndex = -1

    for (let index = 0; index < routeSegment.length; index += 1) {
      const routeCell = routeSegment[index]

      if (existingKeys.has(routeCell.key)) {
        return false
      }

      if (segmentKeys.has(routeCell.key)) {
        return false
      }

      segmentKeys.add(routeCell.key)

      if (routeCell.key === exitKey && exitIndex === -1) {
        exitIndex = index
      }
    }

    if (exitIndex !== -1 && exitIndex !== routeSegment.length - 1) {
      return false
    }

    return true
  }

  const setMode = (mode) => {
    if ((mode === "entry" || mode === "exit") && !canEditEntryExit()) {
      return
    }

    if (mode === "draw" && (!isEntryExitReady() || state.isRouteComplete)) {
      return
    }

    clearPreview()
    stopRouteDraw()
    resetSelectionPointer()

    state.mode = mode
    root.dataset.mazeCurrentMode = mode

    const modeTextMap = {
      entry: "入口指定",
      exit: "出口指定",
      draw: "描画"
    }

    modeLabel.textContent = modeTextMap[mode] || "入口指定"

    modeButtons.forEach((button) => {
      const isActive = button.dataset.mazeMode === mode
      button.classList.toggle("is-active", isActive)
      button.setAttribute("aria-pressed", String(isActive))
    })

    refreshActionButtons()
  }

  const isConflictingSelection = (type, selection) => {
    const otherSelection = type === "entry" ? state.exit : state.entry
    return otherSelection?.key === selection.key
  }

  const applySelection = (type, selection) => {
    if (!canEditEntryExit()) return

    const previous = state[type]

    if (previous && previous.key !== selection.key) {
      const oldCell = findCell(previous.row, previous.col)

      if (oldCell) {
        oldCell.classList.remove(
          type === "entry" ? "is-entry-confirmed" : "is-exit-confirmed"
        )

        const otherSelection = type === "entry" ? state.exit : state.entry
        if (!otherSelection || otherSelection.key !== previous.key) {
          clearSideClasses(oldCell)
        }
      }
    }

    state[type] = selection

    const cell = findCell(selection.row, selection.col)
    if (!cell) return

    cell.classList.remove("is-preview")
    clearSideClasses(cell)
    cell.classList.add(type === "entry" ? "is-entry-confirmed" : "is-exit-confirmed")
    cell.classList.add(selection.sideClass)

    syncEntryExitDataset()
    syncRouteDataset()
    updateBadges()
    refreshActionButtons()
  }

  const addRouteCell = (cell) => {
    const nextRouteCell = buildRouteCell(cell)
    const lastRouteCell = getRouteEndCell()
    const routeSegment = buildInterpolatedRouteCells(lastRouteCell, nextRouteCell)

    if (!validateRouteSegment(routeSegment)) {
      return
    }

    if (state.currentStroke.length === 0) {
      state.redoStack = []
    }

    routeSegment.forEach((routeCell) => {
      appendRouteCell(routeCell, state.currentStroke)
    })

    syncRouteDataset()
    refreshActionButtons()

    if (state.isRouteComplete) {
      stopRouteDraw()
    }
  }

  const clearRoute = () => {
    if (state.routeCells.length === 0) return

    stopRouteDraw()

    state.routeCells.forEach((routeCell) => {
      removeRouteCellVisual(routeCell)
    })

    state.routeCells = []
    state.routeStrokes = []
    state.currentStroke = []
    state.redoStack = []

    syncRouteDataset()
    refreshActionButtons()
  }

  const undoLastCell = () => {
    if (state.routeCells.length === 0) return

    stopRouteDraw()

    const lastStroke = getLastStroke()
    if (!lastStroke || lastStroke.length === 0) return

    const shouldCreateNewStrokeOnRedo = lastStroke.length === 1
    const removedCell = lastStroke.pop()
    const removedRouteCell = removeLastRouteCell()

    if (!removedCell || !removedRouteCell) return

    if (lastStroke.length === 0) {
      state.routeStrokes.pop()
    }

    state.redoStack.push({
      type: "cell",
      cells: [{ ...removedCell }],
      createNewStroke: shouldCreateNewStrokeOnRedo
    })

    syncRouteDataset()
    refreshActionButtons()
  }

  const undoLastStroke = () => {
    if (state.routeStrokes.length === 0) return

    stopRouteDraw()

    const removedStroke = state.routeStrokes.pop()
    if (!removedStroke || removedStroke.length === 0) return

    removedStroke.forEach(() => {
      removeLastRouteCell()
    })

    state.redoStack.push({
      type: "stroke",
      cells: cloneRouteCells(removedStroke)
    })

    syncRouteDataset()
    refreshActionButtons()
  }

  const redoRoute = () => {
    if (state.redoStack.length === 0) return

    stopRouteDraw()

    const action = cloneRedoAction(state.redoStack.pop())
    if (!action) return

    if (action.type === "cell") {
      if (action.createNewStroke || state.routeStrokes.length === 0) {
        const restoredStroke = []
        action.cells.forEach((routeCell) => {
          appendRouteCell(routeCell, restoredStroke)
        })

        if (restoredStroke.length > 0) {
          state.routeStrokes.push(restoredStroke)
        }
      } else {
        const lastStroke = getLastStroke()
        action.cells.forEach((routeCell) => {
          appendRouteCell(routeCell, lastStroke)
        })
      }
    }

    if (action.type === "stroke") {
      const restoredStroke = []
      action.cells.forEach((routeCell) => {
        appendRouteCell(routeCell, restoredStroke)
      })

      if (restoredStroke.length > 0) {
        state.routeStrokes.push(restoredStroke)
      }
    }

    syncRouteDataset()
    refreshActionButtons()
  }

  const clearAll = () => {
    stopRouteDraw()
    clearPreview()
    resetSelectionPointer()

    grid.querySelectorAll(".maze-cell").forEach((cell) => {
      cell.classList.remove(
        "is-preview",
        "is-entry-confirmed",
        "is-exit-confirmed",
        "is-route-cell",
        "is-route-tail"
      )
      clearSideClasses(cell)
    })

    state.entry = null
    state.exit = null
    state.routeCells = []
    state.routeStrokes = []
    state.currentStroke = []
    state.redoStack = []
    state.hasRouteStarted = false
    state.isRouteComplete = false

    syncEntryExitDataset()
    clearGeneratedMazeInput()
    clearMazeEditorState()
    syncRouteDataset()
    updateBadges()
    setMode("entry")
  }

  const startRouteDraw = (cell) => {
    if (!isEntryExitReady() || state.isRouteComplete) return

    const routeCell = buildRouteCell(cell)
    const lastRouteCell = getRouteEndCell()

    if (!lastRouteCell) {
      if (routeCell.key !== state.entry?.key) return
    } else if (routeCell.key !== lastRouteCell.key) {
      return
    }

    state.isDrawing = true
    state.currentStroke = []
    state.hasRouteStarted = true
    addRouteCell(cell)
    refreshActionButtons()
  }

  function stopRouteDraw() {
    if (!state.isDrawing && state.currentStroke.length === 0) {
      return
    }

    if (state.isDrawing) {
      finalizeCurrentStroke()
    }

    state.isDrawing = false
    state.currentStroke = []

    syncRouteDataset()
    refreshActionButtons()
  }

  const findCellFromPoint = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY)
    if (!element) return null

    const cell = element.closest(".maze-cell")
    return cell && grid.contains(cell) ? cell : null
  }

  const getEventCell = (event) => {
    const directTarget = event.target instanceof Element
      ? event.target.closest(".maze-cell")
      : null

    if (directTarget && grid.contains(directTarget)) {
      return directTarget
    }

    return findCellFromPoint(event.clientX, event.clientY)
  }

  const isTouchLikePointer = (event) => {
    return event.pointerType === "touch" || event.pointerType === "pen"
  }

  // selectionPointer.type未使用（削除推奨）
  const resetSelectionPointer = () => {
    state.selectionPointer = {
      id: null,
      type: null,
      startX: 0,
      startY: 0,
      didMove: false
    }
  }

  const beginSelectionPointer = (event) => {
    state.selectionPointer = {
      id: event.pointerId,
      type: event.pointerType || "",
      startX: event.clientX,
      startY: event.clientY,
      didMove: false
    }
  }

  const updateSelectionPointerMovement = (event) => {
    if (state.selectionPointer.id !== event.pointerId) return

    const movedX = Math.abs(event.clientX - state.selectionPointer.startX)
    const movedY = Math.abs(event.clientY - state.selectionPointer.startY)

    if (
      movedX > SELECTION_TAP_MOVE_THRESHOLD ||
      movedY > SELECTION_TAP_MOVE_THRESHOLD
    ) {
      state.selectionPointer.didMove = true
    }
  }

  const shouldConfirmTouchSelection = (event, cell) => {
    if (!cell) return false
    if (state.selectionPointer.id !== event.pointerId) return false
    if (state.selectionPointer.didMove) return false

    return true
  }

  const previewSelectionCell = (cell) => {
    if (!cell || !canEditEntryExit()) return

    clearPreview()

    const selection = buildSelection(cell)
    if (!selection) return
    if (isConflictingSelection(state.mode, selection)) return

    cell.classList.add("is-preview")
    cell.classList.add(selection.sideClass)
    state.previewKey = selection.key
  }

  const confirmSelectionCell = (cell) => {
    if (!cell) return

    const selection = buildSelection(cell)
    if (!selection) return

    clearPreview()

    if (isConflictingSelection(state.mode, selection)) return

    applySelection(state.mode, selection)
  }

  grid.addEventListener("pointerdown", (event) => {
    if (event.isPrimary === false) return

    const cell = getEventCell(event)
    if (!cell) return

    if (state.mode === "draw" && isTouchLikePointer(event)) {
      event.preventDefault()
    }

    if (grid.setPointerCapture) {
      try {
        grid.setPointerCapture(event.pointerId)
      } catch (error) {
      }
    }

    if (state.mode === "draw") {
      startRouteDraw(cell)
      return
    }

    if (isTouchLikePointer(event)) {
      beginSelectionPointer(event)
      clearPreview()
      return
    }

    previewSelectionCell(cell)
  })

  grid.addEventListener("pointermove", (event) => {
    if (event.isPrimary === false) return

    const cell = getEventCell(event)

    if (state.mode === "draw") {
      if (state.isDrawing && cell) {
        event.preventDefault()
        addRouteCell(cell)
      }
      return
    }

    if (isTouchLikePointer(event)) {
      updateSelectionPointerMovement(event)
      return
    }

    if (!cell) {
      clearPreview()
      return
    }

    previewSelectionCell(cell)
  })

  grid.addEventListener("pointerleave", () => {
    if (state.mode === "draw" && state.isDrawing) return
    clearPreview()
  })

  grid.addEventListener("pointerup", (event) => {
    if (event.isPrimary === false) return

    const cell = getEventCell(event)

    if (grid.hasPointerCapture && grid.hasPointerCapture(event.pointerId)) {
      try {
        grid.releasePointerCapture(event.pointerId)
      } catch (error) {
      }
    }

    if (state.mode === "draw") {
      stopRouteDraw()
      return
    }

    if (isTouchLikePointer(event)) {
      updateSelectionPointerMovement(event)

      if (shouldConfirmTouchSelection(event, cell)) {
        confirmSelectionCell(cell)
      }

      resetSelectionPointer()
      return
    }

    if (!cell) return
    confirmSelectionCell(cell)
  })

  grid.addEventListener("pointercancel", () => {
    stopRouteDraw()
    clearPreview()
    resetSelectionPointer()
  })

  grid.addEventListener("dragstart", (event) => {
    event.preventDefault()
  })

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mazeMode)
    })
  })

  if (clearRouteButton) {
    clearRouteButton.addEventListener("click", clearRoute)
  }

  if (undoRouteButton) {
    undoRouteButton.addEventListener("click", undoLastCell)
  }

  if (undoStrokeButton) {
    undoStrokeButton.addEventListener("click", undoLastStroke)
  }

  if (redoRouteButton) {
    redoRouteButton.addEventListener("click", redoRoute)
  }

  if (allClearButton) {
    allClearButton.addEventListener("click", clearAll)
  }

  if (generateButton) {
    generateButton.addEventListener("click", () => {
      if (state.hasGeneratedMaze) return

      const finalizedMazeInput = buildFinalizedMazeInput()
      if (!finalizedMazeInput) return

      const mazeGeneratorInput = buildMazeGeneratorInput(finalizedMazeInput)
      if (!mazeGeneratorInput) return

      syncMazeGeneratorInput(mazeGeneratorInput)
      refreshActionButtons()
    })
  }

  if (previewButton) {
    previewButton.addEventListener("click", () => {
      const rawMazeGeneratorInput = root.dataset.mazeGeneratorInput
      if (!rawMazeGeneratorInput) return

      let mazeGeneratorInput = null

      try {
        mazeGeneratorInput = JSON.parse(rawMazeGeneratorInput)
      } catch (error) {
        console.error("Failed to parse maze generator input:", error)
        return
      }

      const previewPayload = buildPreviewPayload(mazeGeneratorInput)
      if (!previewPayload?.svgs?.question || !previewPayload?.svgs?.answer) return

      const saved = saveMazePreviewPayload(previewPayload)
      if (!saved) return

      persistMazeEditorState()
      goToPreview("question")
    })
  }

  if (resetGeneratedButton) {
    resetGeneratedButton.addEventListener("click", () => {
      clearGeneratedMazeInput()
      refreshActionButtons()
      persistMazeEditorState()
    })
  }

  window.addEventListener("pointerup", stopRouteDraw)
  window.addEventListener("pointercancel", stopRouteDraw)
  window.addEventListener("blur", stopRouteDraw)
  window.addEventListener("resize", updateBadges)

  markCellTypes()
  restorePersistedEditorState()
  syncEntryExitDataset()
  syncRouteDataset({ preserveGeneratedMaze: true })
  setMode(state.mode || "entry")
  updateBadges()
  refreshActionButtons()
  bindJsonCopyButtons()
  syncJsonCopyButtonsState()
}
