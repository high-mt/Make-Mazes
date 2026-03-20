// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
// import "controllers"

const MAZE_SIDE_CLASSES = [
  "is-open-top",
  "is-open-bottom",
  "is-open-left",
  "is-open-right"
]

const initMazeCollapsibles = () => {
  const toggles = document.querySelectorAll(".js-collapsible-toggle")
  if (toggles.length === 0) return

  toggles.forEach((toggle) => {
    if (toggle.dataset.collapsibleInitialized === "true") return
    toggle.dataset.collapsibleInitialized = "true"

    const updateState = () => {
      const targetId = toggle.dataset.targetId
      const enableId = toggle.dataset.enableId

      const content = targetId ? document.getElementById(targetId) : null
      const input = enableId ? document.getElementById(enableId) : null

      if (content) {
        content.classList.toggle("is-open", toggle.checked)
      }

      if (input) {
        if (toggle.checked) {
          input.disabled = false
        } else {
          input.value = ""
          input.disabled = true
        }
      }
    }

    updateState()
    toggle.addEventListener("change", updateState)
  })
}

const initMazeEntryExitSelect = () => {
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
  const modeButtons = root.querySelectorAll(".js-maze-mode-button")
  const drawModeButton = root.querySelector('[data-maze-mode="draw"]')
  const entryModeButton = root.querySelector('[data-maze-mode="entry"]')
  const exitModeButton = root.querySelector('[data-maze-mode="exit"]')

  if (!grid || !gridWrapper || !modeLabel || modeButtons.length === 0) return

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
    redoStack: []
  }

  const cellKey = (row, col) => `${row}-${col}`

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

  const getRouteEndCell = () => {
    return state.routeCells[state.routeCells.length - 1] || null
  }

  const getLastStroke = () => {
    return state.routeStrokes[state.routeStrokes.length - 1] || null
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

  const buildDirectionBetween = (fromCell, toCell) => {
    const rowDiff = toCell.row - fromCell.row
    const colDiff = toCell.col - fromCell.col

    if (rowDiff === -1 && colDiff === 0) return "up"
    if (rowDiff === 1 && colDiff === 0) return "down"
    if (rowDiff === 0 && colDiff === -1) return "left"
    if (rowDiff === 0 && colDiff === 1) return "right"

    return null
  }

  const buildGeneratorRouteCells = (routeCells = []) => {
    return routeCells.map((routeCell, index) => {
      const prevCell = routeCells[index - 1] || null
      const nextCell = routeCells[index + 1] || null
      const routeCellKey = cellKey(routeCell.row, routeCell.col)

      return {
        index,
        key: routeCellKey,
        row: routeCell.row,
        col: routeCell.col,
        prevKey: prevCell ? cellKey(prevCell.row, prevCell.col) : null,
        nextKey: nextCell ? cellKey(nextCell.row, nextCell.col) : null,
        directionFromPrev: prevCell ? buildDirectionBetween(prevCell, routeCell) : null,
        directionToNext: nextCell ? buildDirectionBetween(routeCell, nextCell) : null,
        isEntry: index === 0,
        isExit: index === routeCells.length - 1
      }
    })
  }

  const buildGeneratorRouteSegments = (routeCells = []) => {
    const segments = []

    for (let index = 0; index < routeCells.length - 1; index += 1) {
      const fromCell = routeCells[index]
      const toCell = routeCells[index + 1]

      segments.push({
        index,
        fromKey: cellKey(fromCell.row, fromCell.col),
        toKey: cellKey(toCell.row, toCell.col),
        direction: buildDirectionBetween(fromCell, toCell),
        from: {
          row: fromCell.row,
          col: fromCell.col
        },
        to: {
          row: toCell.row,
          col: toCell.col
        }
      })
    }

    return segments
  }

  const buildRouteIndexByKey = (generatorRouteCells = []) => {
    return generatorRouteCells.reduce((accumulator, routeCell) => {
      accumulator[routeCell.key] = routeCell.index
      return accumulator
    }, {})
  }

  const buildMazeGeneratorInput = (finalizedMazeInput) => {
    if (
      !finalizedMazeInput ||
      !finalizedMazeInput.routeCompleted ||
      !finalizedMazeInput.entry ||
      !finalizedMazeInput.exit ||
      !finalizedMazeInput.routeCells ||
      finalizedMazeInput.routeCells.length === 0
    ) {
      return null
    }

    const generatorRouteCells = buildGeneratorRouteCells(finalizedMazeInput.routeCells)
    const generatorRouteSegments = buildGeneratorRouteSegments(finalizedMazeInput.routeCells)
    const entryKey = cellKey(finalizedMazeInput.entry.row, finalizedMazeInput.entry.col)
    const exitKey = cellKey(finalizedMazeInput.exit.row, finalizedMazeInput.exit.col)
    const firstRouteCell = generatorRouteCells[0] || null
    const lastRouteCell = generatorRouteCells[generatorRouteCells.length - 1] || null

    return {
      grid: {
        rows: finalizedMazeInput.rows,
        cols: finalizedMazeInput.cols
      },
      entry: {
        ...finalizedMazeInput.entry,
        key: entryKey
      },
      exit: {
        ...finalizedMazeInput.exit,
        key: exitKey
      },
      route: {
        cells: generatorRouteCells,
        segments: generatorRouteSegments,
        startKey: firstRouteCell ? firstRouteCell.key : null,
        endKey: lastRouteCell ? lastRouteCell.key : null,
        cellCount: generatorRouteCells.length,
        segmentCount: generatorRouteSegments.length
      },
      lookup: {
        routeIndexByKey: buildRouteIndexByKey(generatorRouteCells)
      }
    }
  }

  const syncMazeGeneratorInput = (finalizedMazeInput = null) => {
    const mazeGeneratorInput = buildMazeGeneratorInput(finalizedMazeInput)

    if (mazeGeneratorInput) {
      root.dataset.mazeGeneratorInput = JSON.stringify(mazeGeneratorInput)
    } else {
      delete root.dataset.mazeGeneratorInput
    }

    root.dataset.generatorReady = String(Boolean(mazeGeneratorInput))

    if (generatorStatusLabel) {
      generatorStatusLabel.textContent = mazeGeneratorInput ? "生成済み" : "未生成"
    }

    if (generatorJsonPreview) {
      generatorJsonPreview.textContent = mazeGeneratorInput
        ? JSON.stringify(mazeGeneratorInput, null, 2)
        : "未生成"
    }
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
      finalizedJsonPreview.textContent = finalizedMazeInput
        ? JSON.stringify(finalizedMazeInput, null, 2)
        : "未確定"
    }

    syncMazeGeneratorInput(finalizedMazeInput)
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

  const syncRouteDataset = () => {
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

    syncFinalizedMazeInput()
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

    badge.classList.remove("is-hidden")
    badge.dataset.side = selection.side

    if (selection.side === "top") {
      badge.style.left = `${cellCenterX}px`
      badge.style.top = `${cellTop - 6}px`
      return
    }

    if (selection.side === "bottom") {
      badge.style.left = `${cellCenterX}px`
      badge.style.top = `${cellTop + cellRect.height + 6}px`
      return
    }

    if (selection.side === "left") {
      badge.style.left = `${cellLeft - 6}px`
      badge.style.top = `${cellCenterY}px`
      return
    }

    badge.style.left = `${cellLeft + cellRect.width + 6}px`
    badge.style.top = `${cellCenterY}px`
  }

  const updateBadges = () => {
    positionBadge(entryBadge, state.entry)
    positionBadge(exitBadge, state.exit)
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

    const shouldDisableMazeActions = !state.isRouteComplete

    if (generateButton) {
      generateButton.disabled = shouldDisableMazeActions
    }

    if (previewButton) {
      previewButton.disabled = shouldDisableMazeActions
    }

    if (resetGeneratedButton) {
      resetGeneratedButton.disabled = shouldDisableMazeActions
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
    if (state.isDrawing) {
      finalizeCurrentStroke()
    }

    state.isDrawing = false
    state.currentStroke = []

    syncRouteDataset()
    refreshActionButtons()
  }

  grid.addEventListener("mousedown", (event) => {
    if (state.mode !== "draw") return

    const cell = event.target.closest(".maze-cell")
    if (!cell) return

    event.preventDefault()
    startRouteDraw(cell)
  })

  grid.addEventListener("mouseover", (event) => {
    const cell = event.target.closest(".maze-cell")
    if (!cell) return

    if (state.mode === "draw") {
      if (state.isDrawing) {
        addRouteCell(cell)
      }
      return
    }

    if (!canEditEntryExit()) return

    clearPreview()

    const selection = buildSelection(cell)
    if (!selection) return

    if (isConflictingSelection(state.mode, selection)) return

    cell.classList.add("is-preview")
    cell.classList.add(selection.sideClass)
    state.previewKey = selection.key
  })

  grid.addEventListener("mouseleave", () => {
    if (state.mode === "draw") return
    clearPreview()
  })

  grid.addEventListener("click", (event) => {
    if (state.mode === "draw") return

    const cell = event.target.closest(".maze-cell")
    if (!cell) return

    const selection = buildSelection(cell)
    if (!selection) return

    clearPreview()

    if (isConflictingSelection(state.mode, selection)) return

    applySelection(state.mode, selection)
  })

  grid.addEventListener("dragstart", (event) => {
    if (state.mode === "draw") {
      event.preventDefault()
    }
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

  window.addEventListener("mouseup", stopRouteDraw)
  window.addEventListener("blur", stopRouteDraw)
  window.addEventListener("resize", updateBadges)

  markCellTypes()
  syncEntryExitDataset()
  syncRouteDataset()
  setMode("entry")
  updateBadges()
  refreshActionButtons()
}

const initMazePage = () => {
  initMazeCollapsibles()
  initMazeEntryExitSelect()
}

document.addEventListener("turbo:load", initMazePage)
