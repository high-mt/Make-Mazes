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
  const gridWrapper = root.querySelector(".maze-grid-wrapper")
  const entryBadge = root.querySelector("[data-maze-entry-badge]")
  const exitBadge = root.querySelector("[data-maze-exit-badge]")
  const routeCountLabel = root.querySelector("[data-maze-route-count]")
  const clearRouteButton = root.querySelector("[data-maze-clear-route]")
  const modeButtons = root.querySelectorAll(".js-maze-mode-button")

  if (!grid || !gridWrapper || !modeLabel || modeButtons.length === 0) return

  const state = {
    mode: "entry",
    previewKey: null,
    entry: null,
    exit: null,
    isDrawing: false,
    routeCells: []
  }

  const cellKey = (row, col) => `${row}-${col}`

  const findCell = (row, col) => {
    return grid.querySelector(`.maze-cell[data-row="${row}"][data-col="${col}"]`)
  }

  const clearSideClasses = (cell) => {
    MAZE_SIDE_CLASSES.forEach((className) => {
      cell.classList.remove(className)
    })
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
  // 
  const buildRouteCellFromPosition = (row, col) => {
    return {
      key: cellKey(row, col),
      row,
      col
    }
  }

  const appendRouteCell = (routeCell) => {
    const lastRouteCell = state.routeCells[state.routeCells.length - 1]
    if (lastRouteCell?.key === routeCell.key) return

    state.routeCells.push(routeCell)

    const cell = findCell(routeCell.row, routeCell.col)
    if (cell) {
      cell.classList.add("is-route-cell")
    }
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
  // 
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
    }

    if (state.exit) {
      root.dataset.exitRow = String(state.exit.row)
      root.dataset.exitCol = String(state.exit.col)
      root.dataset.exitSide = state.exit.side
      root.dataset.exitIndex = String(state.exit.index)
    }
  }

  const syncRouteDataset = () => {
    root.dataset.routeCells = JSON.stringify(state.routeCells)
    root.dataset.routeCellCount = String(state.routeCells.length)

    if (routeCountLabel) {
      routeCountLabel.textContent = String(state.routeCells.length)
    }
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

  const setMode = (mode) => {
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
  }

  const isConflictingSelection = (type, selection) => {
    const otherSelection = type === "entry" ? state.exit : state.entry
    return otherSelection?.key === selection.key
  }

  const applySelection = (type, selection) => {
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
    updateBadges()
  }

  const addRouteCell = (cell) => {
    const nextRouteCell = buildRouteCell(cell)
    const lastRouteCell = state.routeCells[state.routeCells.length - 1]

    const routeSegment = buildInterpolatedRouteCells(lastRouteCell, nextRouteCell)

    routeSegment.forEach((routeCell) => {
      appendRouteCell(routeCell)
    })

    syncRouteDataset()
  }

  const clearRoute = () => {
    state.routeCells.forEach((routeCell) => {
      const cell = findCell(routeCell.row, routeCell.col)
      if (cell) {
        cell.classList.remove("is-route-cell")
      }
    })

    state.routeCells = []
    syncRouteDataset()
  }

  const startRouteDraw = (cell) => {
    state.isDrawing = true
    addRouteCell(cell)
  }

  function stopRouteDraw() {
    state.isDrawing = false
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

  window.addEventListener("mouseup", stopRouteDraw)
  window.addEventListener("blur", stopRouteDraw)
  window.addEventListener("resize", updateBadges)

  markCellTypes()
  syncRouteDataset()
  setMode("entry")
  updateBadges()
}

const initMazePage = () => {
  initMazeCollapsibles()
  initMazeEntryExitSelect()
}

document.addEventListener("turbo:load", initMazePage)
