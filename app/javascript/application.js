// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
// import "controllers"

const MAZE_SIDE_CLASSES = [
  "is-open-top",
  "is-open-bottom",
  "is-open-left",
  "is-open-right"
]

const DIRECTION_ORDER = ["up", "right", "down", "left"]

const OPPOSITE_DIRECTION_MAP = {
  up: "down",
  right: "left",
  down: "up",
  left: "right"
}

const FAKE_ROUTE_CONFIG = {
  maxBranchLevel: 4,
  selectionStrategy: "hierarchy-priority",
  generationStrategy: "straight-hierarchical",
  trunkBranchRules: {
    straightChance: 0.55,
    turnChance: 0.30,
    terminalChance: 0.40
  },
  terminalSproutRules: {
    1: { required: true, singleChance: 1, doubleChance: 0.30 },
    2: { required: true, singleChance: 1, doubleChance: 0.20 },
    3: { required: false, singleChance: 0.45, doubleChance: 0.10 },
    4: { required: false, singleChance: 0, doubleChance: 0 }
  },
  levelLengthRules: {
    1: { minLength: 2, randomExtraMax: 3 },
    2: { minLength: 1, randomExtraMax: 3 },
    3: { minLength: 1, randomExtraMax: 2 },
    4: { minLength: 1, randomExtraMax: 1 }
  }
}

const JSON_CHECKPOINT_PREVIEW_LIMITS = {
  routeCellCount: 5,
  routeSegmentCount: 5,
  startCandidateCount: 5,
  pathCount: 5,
  occupiedKeyCount: 10
}

const MAZE_PREVIEW_STORAGE_KEY = "mazePreviewPayload"

const MAZE_EDITOR_STORAGE_KEY = "mazeEditorState"

const saveMazeEditorState = (editorState = null) => {
  if (!editorState) return false

  try {
    sessionStorage.setItem(MAZE_EDITOR_STORAGE_KEY, JSON.stringify(editorState))
    return true
  } catch (error) {
    console.error("Failed to save maze editor state:", error)
    return false
  }
}

const loadMazeEditorState = () => {
  try {
    const raw = sessionStorage.getItem(MAZE_EDITOR_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error("Failed to load maze editor state:", error)
    return null
  }
}

const clearMazeEditorState = () => {
  try {
    sessionStorage.removeItem(MAZE_EDITOR_STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear maze editor state:", error)
  }
}

const ANSWER_PREVIEW_CONFIG = {
  cellSize: 22,
  wallThickness: 2,
  strokeColor: "#0f172a",
  backgroundColor: "#ffffff",
  padding: 72,
  routeOverlayColor: "#ffaabb",
  routeOverlayInset: 5,
  routeOverlayOpacity: 0.95,
  routeEndpointRadius: 10,
  frameLabelColor: "#334155",
  frameLabelFontSize: 18,
  frameLabelFontWeight: 700,
  frameLabelOffset: 18
}

const saveMazePreviewPayload = (payload = null) => {
  if (!payload) return false

  try {
    sessionStorage.setItem(MAZE_PREVIEW_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch (error) {
    console.error("Failed to save maze preview payload:", error)
    return false
  }
}

const loadMazePreviewPayload = () => {
  try {
    const raw = sessionStorage.getItem(MAZE_PREVIEW_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.error("Failed to load maze preview payload:", error)
    return null
  }
}

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
  // ここから開発時のJSON取得用の定数
  const copyFinalizedJsonButton = root.querySelector("[data-copy-finalized-json]")
  const copyGeneratorJsonButton = root.querySelector("[data-copy-generator-json]")
  // ここまで
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
    hasGeneratedMaze: false
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
      mazeGeneratorInput: root.dataset.mazeGeneratorInput || null,
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
    saveMazeEditorState(buildPersistedEditorState())
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

  const getOppositeDirection = (direction) => {
    return direction ? OPPOSITE_DIRECTION_MAP[direction] || null : null
  }

  const buildNeighborPosition = (row, col, direction) => {
    if (direction === "up") return { row: row - 1, col }
    if (direction === "right") return { row, col: col + 1 }
    if (direction === "down") return { row: row + 1, col }
    if (direction === "left") return { row, col: col - 1 }

    return { row, col }
  }

  const buildPathCellFromDirection = (sourceCell = {}, direction = null) => {
    if (
      !sourceCell ||
      !Number.isInteger(sourceCell.row) ||
      !Number.isInteger(sourceCell.col) ||
      !direction
    ) {
      return null
    }

    const nextPosition = buildNeighborPosition(sourceCell.row, sourceCell.col, direction)

    return {
      key: cellKey(nextPosition.row, nextPosition.col),
      row: nextPosition.row,
      col: nextPosition.col
    }
  }

  const buildConnectedDirections = ({ directionToPrev = null, directionToNext = null } = {}) => {
    return DIRECTION_ORDER.filter((direction) => {
      return direction === directionToPrev || direction === directionToNext
    })
  }

  const buildUnconnectedDirections = (connectedDirections = []) => {
    return DIRECTION_ORDER.filter((direction) => !connectedDirections.includes(direction))
  }

  const isStraightConnection = (connectedDirections = []) => {
    if (connectedDirections.length !== 2) return false

    const directionSet = new Set(connectedDirections)

    return (
      (directionSet.has("up") && directionSet.has("down")) ||
      (directionSet.has("left") && directionSet.has("right"))
    )
  }

  const buildShapeType = ({ isEntry = false, isExit = false, connectedDirections = [] } = {}) => {
    if (isEntry) return "start"
    if (isExit) return "end"
    if (connectedDirections.length !== 2) return "unknown"

    return isStraightConnection(connectedDirections) ? "straight" : "turn"
  }

  const buildAxisType = (connectedDirections = []) => {
    if (!isStraightConnection(connectedDirections)) return null

    const directionSet = new Set(connectedDirections)

    if (directionSet.has("up") && directionSet.has("down")) return "vertical"
    if (directionSet.has("left") && directionSet.has("right")) return "horizontal"

    return null
  }

  const buildTurnType = (connectedDirections = []) => {
    if (connectedDirections.length !== 2) return null
    if (isStraightConnection(connectedDirections)) return null

    return DIRECTION_ORDER
      .filter((direction) => connectedDirections.includes(direction))
      .join("-")
  }

  const buildNeighborMap = (routeCell, connectedDirections = [], routeIndexByKey = {}) => {
    return DIRECTION_ORDER.reduce((accumulator, direction) => {
      const neighborPosition = buildNeighborPosition(routeCell.row, routeCell.col, direction)
      const isInsideGrid = (
        neighborPosition.row >= 0 &&
        neighborPosition.row < rows &&
        neighborPosition.col >= 0 &&
        neighborPosition.col < cols
      )
      const neighborKey = isInsideGrid
        ? cellKey(neighborPosition.row, neighborPosition.col)
        : null
      const routeIndex = neighborKey ? routeIndexByKey[neighborKey] : null
      const isRoute = Number.isInteger(routeIndex)

      accumulator[direction] = {
        direction,
        row: isInsideGrid ? neighborPosition.row : null,
        col: isInsideGrid ? neighborPosition.col : null,
        key: neighborKey,
        isInsideGrid,
        isRoute,
        routeIndex: isRoute ? routeIndex : null,
        isConnected: connectedDirections.includes(direction)
      }

      return accumulator
    }, {})
  }

  const buildRouteShapeCounts = (generatorRouteCells = []) => {
    return generatorRouteCells.reduce((accumulator, routeCell) => {
      const shapeType = routeCell.shapeType || "unknown"
      accumulator[shapeType] = (accumulator[shapeType] || 0) + 1
      return accumulator
    }, {
      start: 0,
      end: 0,
      straight: 0,
      turn: 0,
      unknown: 0
    })
  }

  const BRANCH_LABEL_BY_LEVEL = {
    1: "parent",
    2: "child",
    3: "grandchild",
    4: "great-grandchild"
  }

  const buildBranchLabel = (branchLevel = 1) => {
    return BRANCH_LABEL_BY_LEVEL[branchLevel] || `level-${branchLevel}`
  }

  const buildBranchLengthSettings = (branchLevel = 1) => {
    const levelRule =
      FAKE_ROUTE_CONFIG.levelLengthRules[branchLevel] ||
      FAKE_ROUTE_CONFIG.levelLengthRules[1] ||
      { minLength: 1, randomExtraMax: 0 }

    const minLength = levelRule.minLength || 1
    const randomExtraMax = levelRule.randomExtraMax || 0
    const randomExtra = randomExtraMax > 0
      ? Math.floor(Math.random() * (randomExtraMax + 1))
      : 0

    return {
      minLength,
      randomExtraMax,
      targetLength: minLength + randomExtra
    }
  }

  const buildRouteBranchSpawnChance = (routeCell = {}) => {
    if (routeCell.shapeType === "turn") {
      return FAKE_ROUTE_CONFIG.trunkBranchRules.turnChance
    }

    if (routeCell.shapeType === "start" || routeCell.shapeType === "end") {
      return FAKE_ROUTE_CONFIG.trunkBranchRules.terminalChance
    }

    return FAKE_ROUTE_CONFIG.trunkBranchRules.straightChance
  }

  const shouldSpawnBranch = (chance = 1) => {
    return Math.random() <= chance
  }

  const shuffleDirections = (directions = []) => {
    const cloned = [...directions]

    for (let index = cloned.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
        ;[cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]]
    }

    return cloned
  }

  const getPerpendicularDirections = (direction = null) => {
    if (direction === "up" || direction === "down") {
      return ["left", "right"]
    }

    if (direction === "left" || direction === "right") {
      return ["up", "down"]
    }

    return []
  }

  const buildFakeRouteStartCandidateType = ({
    sourceType = "route",
    routeCell = {},
    spawnedFrom = null
  } = {}) => {
    if (sourceType === "fake-route") {
      return spawnedFrom === "terminal-side-double"
        ? "terminal-double-side-branch"
        : "terminal-side-branch"
    }

    if (routeCell.shapeType === "start" || routeCell.shapeType === "end") {
      return "terminal-branch"
    }

    if (routeCell.shapeType === "turn") {
      return "turn-side-branch"
    }

    if (routeCell.shapeType === "straight") {
      return "straight-side-branch"
    }

    return "generic-branch"
  }

  const buildFakeRouteStartCandidate = ({
    id,
    direction,
    startCell = null,
    firstStep = null,
    branchLevel = 1,
    parentPathId = null,
    parentCellKey = null,
    sourceType = "route",
    sourcePathId = null,
    sourcePathRole = null,
    sourceBranchLevel = 0,
    candidateType = "generic-branch",
    spawnedFrom = null,
    spawnChance = null,
    sourceBranchCandidateCount = 0,
    branchRequirement = "optional"
  } = {}) => {
    const { minLength, randomExtraMax, targetLength } = buildBranchLengthSettings(branchLevel)

    return {
      id,
      type: "branch-start",
      candidateType,
      direction,
      branchLevel,
      branchLabel: buildBranchLabel(branchLevel),
      parentPathId,
      parentCellKey,
      sourceType,
      sourcePathId,
      sourcePathRole,
      sourceBranchLevel,
      spawnedFrom,
      spawnChance,
      branchRequirement,
      minLength,
      randomExtraMax,
      targetLength,
      startCell,
      firstStep,
      sourceBranchCandidateCount
    }
  }

  const buildFakeRouteStartCandidates = (generatorRouteCells = []) => {
    return generatorRouteCells.reduce((accumulator, routeCell) => {
      const branchDirections = routeCell.branchCandidateDirections || []
      const spawnChance = buildRouteBranchSpawnChance(routeCell)

      branchDirections.forEach((direction) => {
        const firstStepNeighbor = routeCell.neighbors?.[direction]

        if (
          !firstStepNeighbor ||
          !firstStepNeighbor.isInsideGrid ||
          firstStepNeighbor.isRoute ||
          !shouldSpawnBranch(spawnChance)
        ) {
          return
        }

        accumulator.push(
          buildFakeRouteStartCandidate({
            id: `${routeCell.key}:${direction}`,
            direction,
            branchLevel: 1,
            parentPathId: null,
            parentCellKey: routeCell.key,
            sourceType: "route",
            sourcePathId: null,
            sourcePathRole: "trunk",
            sourceBranchLevel: 0,
            candidateType: buildFakeRouteStartCandidateType({
              sourceType: "route",
              routeCell
            }),
            spawnedFrom: routeCell.shapeType === "turn" ? "trunk-turn" : "trunk-side",
            spawnChance,
            branchRequirement: "optional",
            startCell: {
              key: routeCell.key,
              row: routeCell.row,
              col: routeCell.col,
              routeIndex: routeCell.index,
              shapeType: routeCell.shapeType,
              axis: routeCell.axis,
              turnType: routeCell.turnType
            },
            firstStep: {
              key: firstStepNeighbor.key,
              row: firstStepNeighbor.row,
              col: firstStepNeighbor.col
            },
            sourceBranchCandidateCount: routeCell.branchCandidateCount
          })
        )
      })

      return accumulator
    }, [])
  }

  const buildStartCandidateGroupId = (path = {}, nextBranchLevel = 1) => {
    return `sprout-group:l${nextBranchLevel}:${path.id || "unknown"}:${path.endCell?.key || "unknown"}`
  }

  const buildStartCandidateGroups = (startCandidates = []) => {
    const groupMap = new Map()

    startCandidates.forEach((startCandidate) => {
      const groupId = startCandidate.sproutGroupId || startCandidate.id

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId,
          minSuccessCount: Number.isInteger(startCandidate.sproutGroupMinSuccessCount)
            ? startCandidate.sproutGroupMinSuccessCount
            : startCandidate.branchRequirement === "required"
              ? 1
              : 0,
          maxSuccessCount: Number.isInteger(startCandidate.sproutGroupMaxSuccessCount)
            ? startCandidate.sproutGroupMaxSuccessCount
            : 1,
          candidates: []
        })
      }

      groupMap.get(groupId).candidates.push(startCandidate)
    })

    return Array.from(groupMap.values()).map((group) => {
      return {
        ...group,
        candidates: [...group.candidates].sort((left, right) => {
          const leftOrder = Number.isInteger(left.sproutOrder) ? left.sproutOrder : 0
          const rightOrder = Number.isInteger(right.sproutOrder) ? right.sproutOrder : 0
          return leftOrder - rightOrder
        })
      }
    })
  }

  const buildTerminalBranchStartCandidates = (
    generatedPaths = [],
    routeIndexByKey = {},
    globalOccupiedKeys = new Set()
  ) => {
    return generatedPaths.reduce((accumulator, path) => {
      if (!path || path.pathStatus !== "generated") return accumulator
      if (!Number.isInteger(path.branchLevel)) return accumulator
      if (path.branchLevel >= FAKE_ROUTE_CONFIG.maxBranchLevel) return accumulator
      if (!path.endCell?.key || !path.direction) return accumulator

      const nextBranchLevel = path.branchLevel + 1
      const sproutRule = FAKE_ROUTE_CONFIG.terminalSproutRules[path.branchLevel] || {
        required: false,
        singleChance: 0,
        doubleChance: 0
      }

      const availableDirections = getPerpendicularDirections(path.direction).filter((direction) => {
        const firstStep = buildPathCellFromDirection(path.endCell, direction)

        return !getFakeRouteStopReason({
          pathCell: firstStep,
          routeIndexByKey,
          globalOccupiedKeys
        })
      })

      if (availableDirections.length === 0) {
        return accumulator
      }

      const shuffledDirections = shuffleDirections(availableDirections)
      const candidateDirections = []
      const canTryDouble = shuffledDirections.length > 1
      const doubleTriggered = canTryDouble && shouldSpawnBranch(sproutRule.doubleChance || 0)

      let minSuccessCount = 0
      let maxSuccessCount = 0

      if (sproutRule.required) {
        candidateDirections.push(...shuffledDirections)
        minSuccessCount = 1
        maxSuccessCount = doubleTriggered ? Math.min(2, candidateDirections.length) : 1
      } else {
        if (!shouldSpawnBranch(sproutRule.singleChance || 0)) {
          return accumulator
        }

        candidateDirections.push(shuffledDirections[0])

        if (doubleTriggered) {
          candidateDirections.push(shuffledDirections[1])
        }

        minSuccessCount = 0
        maxSuccessCount = candidateDirections.length
      }

      if (candidateDirections.length === 0 || maxSuccessCount === 0) {
        return accumulator
      }

      const sproutGroupId = buildStartCandidateGroupId(path, nextBranchLevel)
      const spawnedFrom = doubleTriggered ? "terminal-side-double" : "terminal-side"

      candidateDirections.forEach((direction, index) => {
        const firstStep = buildPathCellFromDirection(path.endCell, direction)

        const startCandidate = buildFakeRouteStartCandidate({
          id: `branch-start:l${nextBranchLevel}:${path.endCell.key}:${direction}:${index}`,
          direction,
          branchLevel: nextBranchLevel,
          parentPathId: path.id,
          parentCellKey: path.endCell.key,
          sourceType: "fake-route",
          sourcePathId: path.id,
          sourcePathRole: path.pathRole || "branch",
          sourceBranchLevel: path.branchLevel,
          candidateType: buildFakeRouteStartCandidateType({
            sourceType: "fake-route",
            spawnedFrom
          }),
          spawnedFrom,
          spawnChance: sproutRule.required ? 1 : sproutRule.singleChance || 0,
          branchRequirement: sproutRule.required ? "required" : "optional",
          startCell: {
            key: path.endCell.key,
            row: path.endCell.row,
            col: path.endCell.col,
            branchLevel: path.branchLevel,
            pathId: path.id,
            pathRole: path.pathRole || "branch",
            direction: path.direction
          },
          firstStep,
          sourceBranchCandidateCount: availableDirections.length
        })

        accumulator.push({
          ...startCandidate,
          sproutGroupId,
          sproutOrder: index,
          sproutGroupMinSuccessCount: minSuccessCount,
          sproutGroupMaxSuccessCount: maxSuccessCount
        })
      })

      return accumulator
    }, [])
  }

  const buildFakeRouteSelectedCandidate = (startCandidate = null) => {
    if (!startCandidate) return null

    return {
      id: startCandidate.id,
      type: startCandidate.type,
      candidateType: startCandidate.candidateType,
      direction: startCandidate.direction,
      branchLevel: startCandidate.branchLevel,
      branchLabel: startCandidate.branchLabel,
      parentPathId: startCandidate.parentPathId,
      parentCellKey: startCandidate.parentCellKey,
      sourceType: startCandidate.sourceType,
      sourcePathId: startCandidate.sourcePathId,
      sourcePathRole: startCandidate.sourcePathRole,
      sourceBranchLevel: startCandidate.sourceBranchLevel,
      spawnedFrom: startCandidate.spawnedFrom,
      branchRequirement: startCandidate.branchRequirement,
      minLength: startCandidate.minLength,
      randomExtraMax: startCandidate.randomExtraMax,
      targetLength: startCandidate.targetLength,
      startCell: {
        ...startCandidate.startCell
      },
      firstStep: {
        ...startCandidate.firstStep
      },
      sourceBranchCandidateCount: startCandidate.sourceBranchCandidateCount
    }
  }

  const buildFakeRouteGeneratedCell = (pathCell = {}, stepIndex = 0) => {
    return {
      key: pathCell.key,
      row: pathCell.row,
      col: pathCell.col,
      stepIndex
    }
  }

  const buildFakeRoutePathBase = (startCandidate = null, attemptIndex = 0) => {
    if (!startCandidate) return null

    const branchLevel = startCandidate.branchLevel || 1

    return {
      id: `fake-path:l${branchLevel}:a${attemptIndex}`,
      type: "fake-route",
      pathRole: "branch",
      branchLevel,
      branchLabel: startCandidate.branchLabel || buildBranchLabel(branchLevel),
      parentPathId: startCandidate.parentPathId || null,
      parentCellKey: startCandidate.parentCellKey || startCandidate.startCell?.key || null,
      sourceType: startCandidate.sourceType || "route",
      sourcePathId: startCandidate.sourcePathId || null,
      sourcePathRole: startCandidate.sourcePathRole || null,
      sourceBranchLevel: Number.isInteger(startCandidate.sourceBranchLevel)
        ? startCandidate.sourceBranchLevel
        : 0,
      spawnedFrom: startCandidate.spawnedFrom || null,
      selectionIndex: attemptIndex,
      generationStrategy: FAKE_ROUTE_CONFIG.generationStrategy,
      startCandidateId: startCandidate.id,
      candidateType: startCandidate.candidateType,
      direction: startCandidate.direction,
      minLength: startCandidate.minLength || 1,
      randomExtraMax: startCandidate.randomExtraMax || 0,
      maxLength: startCandidate.targetLength || startCandidate.minLength || 1,
      branchRequirement: startCandidate.branchRequirement || "optional",
      spawnChance: startCandidate.spawnChance ?? null,
      sproutGroupId: startCandidate.sproutGroupId || null,
      sproutOrder: Number.isInteger(startCandidate.sproutOrder)
        ? startCandidate.sproutOrder
        : 0,
      startCell: {
        ...startCandidate.startCell
      },
      firstStep: {
        ...startCandidate.firstStep
      }
    }
  }

  const buildFakeRouteBlockedCell = (pathCell = {}, stepIndex = null) => {
    if (
      !pathCell ||
      !Number.isInteger(pathCell.row) ||
      !Number.isInteger(pathCell.col)
    ) {
      return null
    }

    return {
      key: pathCell.key || cellKey(pathCell.row, pathCell.col),
      row: pathCell.row,
      col: pathCell.col,
      stepIndex
    }
  }

  const canUseFakeRouteCell = ({
    pathCell = {},
    routeIndexByKey = {},
    localOccupiedKeys = new Set(),
    globalOccupiedKeys = new Set()
  } = {}) => {
    if (!pathCell?.key) return false
    if (Number.isInteger(routeIndexByKey[pathCell.key])) return false
    if (localOccupiedKeys.has(pathCell.key)) return false
    if (globalOccupiedKeys.has(pathCell.key)) return false

    return true
  }

  const buildNextStraightFakeRouteCell = (currentCell = {}, direction = null) => {
    return buildPathCellFromDirection(currentCell, direction)
  }

  const getFakeRouteStopReason = ({
    pathCell = {},
    routeIndexByKey = {},
    localOccupiedKeys = new Set(),
    globalOccupiedKeys = new Set()
  } = {}) => {
    if (
      !pathCell ||
      !Number.isInteger(pathCell.row) ||
      !Number.isInteger(pathCell.col)
    ) {
      return "out-of-grid"
    }

    const isInsideGrid = (
      pathCell.row >= 0 &&
      pathCell.row < rows &&
      pathCell.col >= 0 &&
      pathCell.col < cols
    )

    if (!isInsideGrid) {
      return "out-of-grid"
    }

    if (canUseFakeRouteCell({
      pathCell,
      routeIndexByKey,
      localOccupiedKeys,
      globalOccupiedKeys
    })) {
      return null
    }

    if (Number.isInteger(routeIndexByKey[pathCell.key])) {
      return "route-collision"
    }

    if (localOccupiedKeys.has(pathCell.key)) {
      return "self-collision"
    }

    if (globalOccupiedKeys.has(pathCell.key)) {
      return "fake-route-collision"
    }

    return "route-collision"
  }

  const buildFakeRouteEndCell = (generatedCells = []) => {
    const endCell = generatedCells[generatedCells.length - 1] || null

    return endCell ? {
      key: endCell.key,
      row: endCell.row,
      col: endCell.col,
      stepIndex: endCell.stepIndex
    } : null
  }

  const buildSingleFakeRoutePathResult = (
    startCandidate = null,
    routeIndexByKey = {},
    globalOccupiedKeys = new Set(),
    attemptIndex = 0
  ) => {
    if (!startCandidate) return null

    const processedStartCandidate = buildFakeRouteSelectedCandidate(startCandidate)
    const localOccupiedKeys = new Set()
    const generatedCells = []
    const pathBase = buildFakeRoutePathBase(startCandidate, attemptIndex)
    const firstStep = startCandidate.firstStep
    const failureCategory = startCandidate.branchRequirement === "required"
      ? "required-branch-failed"
      : "optional-branch-failed"

    const firstStepStopReason = getFakeRouteStopReason({
      pathCell: firstStep,
      routeIndexByKey,
      localOccupiedKeys,
      globalOccupiedKeys
    })

    if (firstStepStopReason) {
      return {
        success: false,
        processedStartCandidate,
        path: null,
        failedPath: {
          ...pathBase,
          pathStatus: "failed",
          actualLength: 0,
          reachedMaxLength: false,
          stopReason: firstStepStopReason,
          failureCategory,
          failedStepIndex: 0,
          blockedCell: buildFakeRouteBlockedCell(firstStep, 0),
          cells: [],
          cellCount: 0,
          endCell: null
        },
        occupiedKeys: []
      }
    }

    const firstGeneratedCell = buildFakeRouteGeneratedCell(firstStep, 0)
    generatedCells.push(firstGeneratedCell)
    localOccupiedKeys.add(firstGeneratedCell.key)

    let currentCell = firstGeneratedCell
    let stopReason = null
    let blockedCell = null

    for (let stepIndex = 1; stepIndex < pathBase.maxLength; stepIndex += 1) {
      const nextPathCell = buildNextStraightFakeRouteCell(currentCell, startCandidate.direction)

      stopReason = getFakeRouteStopReason({
        pathCell: nextPathCell,
        routeIndexByKey,
        localOccupiedKeys,
        globalOccupiedKeys
      })

      if (stopReason) {
        blockedCell = buildFakeRouteBlockedCell(nextPathCell, stepIndex)
        break
      }

      const nextGeneratedCell = buildFakeRouteGeneratedCell(nextPathCell, stepIndex)
      generatedCells.push(nextGeneratedCell)
      localOccupiedKeys.add(nextGeneratedCell.key)
      currentCell = nextGeneratedCell
    }

    const reachedMaxLength = generatedCells.length === pathBase.maxLength

    if (reachedMaxLength) {
      stopReason = "max-length"
      blockedCell = null
    }

    const minimumLengthSatisfied = generatedCells.length >= pathBase.minLength

    if (!minimumLengthSatisfied) {
      return {
        success: false,
        processedStartCandidate,
        path: null,
        failedPath: {
          ...pathBase,
          pathStatus: "failed",
          actualLength: generatedCells.length,
          reachedMaxLength: false,
          stopReason: stopReason || "below-min-length",
          failureCategory,
          blockedCell,
          cells: generatedCells,
          cellCount: generatedCells.length,
          endCell: buildFakeRouteEndCell(generatedCells)
        },
        occupiedKeys: []
      }
    }

    return {
      success: true,
      processedStartCandidate,
      path: {
        ...pathBase,
        pathStatus: "generated",
        actualLength: generatedCells.length,
        reachedMaxLength,
        stopReason,
        blockedCell,
        cells: generatedCells,
        cellCount: generatedCells.length,
        endCell: buildFakeRouteEndCell(generatedCells)
      },
      failedPath: null,
      occupiedKeys: generatedCells.map((generatedCell) => generatedCell.key)
    }
  }

  const buildBranchLevelCountMap = (pathItems = []) => {
    const countMap = {}

    for (let level = 1; level <= FAKE_ROUTE_CONFIG.maxBranchLevel; level += 1) {
      countMap[level] = 0
    }

    pathItems.forEach((path) => {
      if (
        path &&
        Number.isInteger(path.branchLevel) &&
        countMap[path.branchLevel] !== undefined
      ) {
        countMap[path.branchLevel] += 1
      }
    })

    return countMap
  }

  const buildFakeRouteHierarchySummary = (paths = [], failedPaths = []) => {
    return {
      maxBranchLevel: FAKE_ROUTE_CONFIG.maxBranchLevel,
      generatedCountByLevel: buildBranchLevelCountMap(paths),
      failedCountByLevel: buildBranchLevelCountMap(failedPaths)
    }
  }

  const buildGeneratedFakeRoutePaths = (generatorRouteCells = [], routeIndexByKey = {}) => {
    const allStartCandidates = []
    const processedStartCandidates = []
    const paths = []
    const failedPaths = []
    const globalOccupiedKeys = new Set()

    let currentLevelCandidates = buildFakeRouteStartCandidates(generatorRouteCells)
    allStartCandidates.push(...currentLevelCandidates)

    for (let branchLevel = 1; branchLevel <= FAKE_ROUTE_CONFIG.maxBranchLevel; branchLevel += 1) {
      if (currentLevelCandidates.length === 0) break

      const generatedPathsForLevel = []
      const candidateGroups = buildStartCandidateGroups(currentLevelCandidates)

      candidateGroups.forEach((candidateGroup) => {
        let successCount = 0

        for (const startCandidate of candidateGroup.candidates) {
          if (successCount >= candidateGroup.maxSuccessCount) {
            break
          }

          const result = buildSingleFakeRoutePathResult(
            startCandidate,
            routeIndexByKey,
            globalOccupiedKeys,
            processedStartCandidates.length
          )

          if (!result) {
            continue
          }

          if (result.processedStartCandidate) {
            processedStartCandidates.push(result.processedStartCandidate)
          }

          if (result.path) {
            paths.push(result.path)
            generatedPathsForLevel.push(result.path)
            successCount += 1

            result.occupiedKeys.forEach((occupiedKey) => {
              globalOccupiedKeys.add(occupiedKey)
            })

            continue
          }

          if (result.failedPath) {
            failedPaths.push(result.failedPath)
          }
        }

        if (
          candidateGroup.minSuccessCount > 0 &&
          successCount < candidateGroup.minSuccessCount
        ) {
          // 今回は required 枝を再試行で救うところまで対応
          // ここに来るのは「試せる候補を全て試しても required 枝を確保できなかった」ケース
        }
      })

      if (branchLevel === FAKE_ROUTE_CONFIG.maxBranchLevel) {
        break
      }

      currentLevelCandidates = buildTerminalBranchStartCandidates(
        generatedPathsForLevel,
        routeIndexByKey,
        globalOccupiedKeys
      )

      allStartCandidates.push(...currentLevelCandidates)
    }

    const selectedStartCandidate = processedStartCandidates[0] || null

    return {
      selectionStrategy: FAKE_ROUTE_CONFIG.selectionStrategy,
      startCandidates: allStartCandidates,
      startCandidateCount: allStartCandidates.length,
      selectedStartCandidate,
      processedStartCandidates,
      attemptedCandidateCount: processedStartCandidates.length,
      paths,
      generatedPathCount: paths.length,
      failedPaths,
      failedPathCount: failedPaths.length,
      occupiedKeys: Array.from(globalOccupiedKeys).sort(),
      occupiedKeyCount: globalOccupiedKeys.size,
      hierarchySummary: buildFakeRouteHierarchySummary(paths, failedPaths)
    }
  }

  const buildGeneratorRouteCells = (routeCells = [], routeIndexByKey = {}) => {
    return routeCells.map((routeCell, index) => {
      const prevCell = routeCells[index - 1] || null
      const nextCell = routeCells[index + 1] || null
      const routeCellKey = cellKey(routeCell.row, routeCell.col)
      const isEntry = index === 0
      const isExit = index === routeCells.length - 1
      const directionFromPrev = prevCell ? buildDirectionBetween(prevCell, routeCell) : null
      const directionToPrev = getOppositeDirection(directionFromPrev)
      const directionToNext = nextCell ? buildDirectionBetween(routeCell, nextCell) : null
      const connectedDirections = buildConnectedDirections({
        directionToPrev,
        directionToNext
      })
      const unconnectedDirections = buildUnconnectedDirections(connectedDirections)
      const neighbors = buildNeighborMap(routeCell, connectedDirections, routeIndexByKey)
      const branchCandidateDirections = unconnectedDirections.filter((direction) => {
        const neighbor = neighbors[direction]
        return neighbor.isInsideGrid && !neighbor.isRoute
      })

      return {
        index,
        key: routeCellKey,
        row: routeCell.row,
        col: routeCell.col,
        prevKey: prevCell ? cellKey(prevCell.row, prevCell.col) : null,
        nextKey: nextCell ? cellKey(nextCell.row, nextCell.col) : null,
        directionFromPrev,
        directionToPrev,
        directionToNext,
        isEntry,
        isExit,
        connectedDirections,
        unconnectedDirections,
        connectionCount: connectedDirections.length,
        shapeType: buildShapeType({
          isEntry,
          isExit,
          connectedDirections
        }),
        axis: buildAxisType(connectedDirections),
        turnType: buildTurnType(connectedDirections),
        neighbors,
        branchCandidateDirections,
        branchCandidateCount: branchCandidateDirections.length
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

  const buildRouteIndexByKey = (routeCells = []) => {
    return routeCells.reduce((accumulator, routeCell, index) => {
      const routeCellKey = routeCell.key || cellKey(routeCell.row, routeCell.col)
      const routeCellIndex = Number.isInteger(routeCell.index) ? routeCell.index : index

      accumulator[routeCellKey] = routeCellIndex
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

    const routeIndexByKey = buildRouteIndexByKey(finalizedMazeInput.routeCells)
    const generatorRouteCells = buildGeneratorRouteCells(
      finalizedMazeInput.routeCells,
      routeIndexByKey
    )
    const generatorRouteSegments = buildGeneratorRouteSegments(finalizedMazeInput.routeCells)

    const {
      selectionStrategy: fakeRouteSelectionStrategy,
      startCandidates: fakeRouteStartCandidates,
      startCandidateCount: fakeRouteStartCandidateCount,
      selectedStartCandidate,
      processedStartCandidates,
      attemptedCandidateCount,
      paths: generatedFakeRoutePaths,
      generatedPathCount,
      failedPaths: failedFakeRoutePaths,
      failedPathCount,
      occupiedKeys: fakeRouteOccupiedKeys,
      occupiedKeyCount: fakeRouteOccupiedKeyCount,
      hierarchySummary: fakeRouteHierarchySummary
    } = buildGeneratedFakeRoutePaths(generatorRouteCells, routeIndexByKey)

    const entryKey = cellKey(finalizedMazeInput.entry.row, finalizedMazeInput.entry.col)
    const exitKey = cellKey(finalizedMazeInput.exit.row, finalizedMazeInput.exit.col)
    const firstRouteCell = generatorRouteCells[0] || null
    const lastRouteCell = generatorRouteCells[generatorRouteCells.length - 1] || null
    const routeShapeCounts = buildRouteShapeCounts(generatorRouteCells)
    const branchCandidateTotalCount = generatorRouteCells.reduce((totalCount, routeCell) => {
      return totalCount + routeCell.branchCandidateCount
    }, 0)

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
        segmentCount: generatorRouteSegments.length,
        shapeCounts: routeShapeCounts,
        branchCandidateTotalCount
      },
      fakeRoute: {
        selectionStrategy: fakeRouteSelectionStrategy,
        startCandidates: fakeRouteStartCandidates,
        startCandidateCount: fakeRouteStartCandidateCount,
        selectedStartCandidate,
        processedStartCandidates,
        attemptedCandidateCount,
        paths: generatedFakeRoutePaths,
        generatedPathCount,
        failedPaths: failedFakeRoutePaths,
        failedPathCount,
        occupiedKeys: fakeRouteOccupiedKeys,
        occupiedKeyCount: fakeRouteOccupiedKeyCount,
        hierarchySummary: fakeRouteHierarchySummary
      },
      lookup: {
        routeIndexByKey
      }
    }
  }

  const buildCheckpointPreviewList = (items = [], maxCount = 5) => {
    return items.slice(0, maxCount)
  }

  const buildFakeRoutePathCheckpoint = (path = {}) => {
    return {
      id: path.id || null,
      parentPathId: path.parentPathId || null,
      parentCellKey: path.parentCellKey || null,
      sourceType: path.sourceType || null,
      sourcePathId: path.sourcePathId || null,
      branchLevel: path.branchLevel || null,
      branchLabel: path.branchLabel || null,
      direction: path.direction || null,
      minLength: path.minLength || 0,
      maxLength: path.maxLength || 0,
      pathStatus: path.pathStatus || null,
      actualLength: path.actualLength || 0,
      cellCount: path.cellCount || 0,
      stopReason: path.stopReason || null,
      blockedCell: path.blockedCell || null,
      endCell: path.endCell || null
    }
  }

  const buildFinalizedJsonCheckpoint = (finalizedMazeInput = null) => {
    if (!finalizedMazeInput) return null

    const routeCells = finalizedMazeInput.routeCells || []

    return {
      checkpointVersion: 1,
      grid: {
        rows: finalizedMazeInput.rows,
        cols: finalizedMazeInput.cols
      },
      entry: finalizedMazeInput.entry,
      exit: finalizedMazeInput.exit,
      routeCompleted: finalizedMazeInput.routeCompleted,
      routeCellCount: finalizedMazeInput.routeCellCount,
      routeStartCell: routeCells[0] || null,
      routeEndCell: routeCells[routeCells.length - 1] || null,
      routeCellsPreview: buildCheckpointPreviewList(
        routeCells,
        JSON_CHECKPOINT_PREVIEW_LIMITS.routeCellCount
      )
    }
  }

  const buildGeneratorJsonCheckpoint = (mazeGeneratorInput = null) => {
    if (!mazeGeneratorInput) return null

    const route = mazeGeneratorInput.route || {}
    const fakeRoute = mazeGeneratorInput.fakeRoute || {}

    return {
      checkpointVersion: 1,
      grid: mazeGeneratorInput.grid,
      entry: mazeGeneratorInput.entry,
      exit: mazeGeneratorInput.exit,
      routeSummary: {
        startKey: route.startKey || null,
        endKey: route.endKey || null,
        cellCount: route.cellCount || 0,
        segmentCount: route.segmentCount || 0,
        shapeCounts: route.shapeCounts || {},
        branchCandidateTotalCount: route.branchCandidateTotalCount || 0
      },
      fakeRouteSummary: {
        selectionStrategy: fakeRoute.selectionStrategy || null,
        selectedStartCandidate: fakeRoute.selectedStartCandidate || null,
        startCandidateCount: fakeRoute.startCandidateCount || 0,
        attemptedCandidateCount: fakeRoute.attemptedCandidateCount || 0,
        generatedPathCount: fakeRoute.generatedPathCount || 0,
        failedPathCount: fakeRoute.failedPathCount || 0,
        occupiedKeyCount: fakeRoute.occupiedKeyCount || 0,
        hierarchySummary: fakeRoute.hierarchySummary || null
      },
      preview: {
        startCandidates: buildCheckpointPreviewList(
          fakeRoute.startCandidates || [],
          JSON_CHECKPOINT_PREVIEW_LIMITS.startCandidateCount
        ),
        routeSegments: buildCheckpointPreviewList(
          route.segments || [],
          JSON_CHECKPOINT_PREVIEW_LIMITS.routeSegmentCount
        ),
        generatedPaths: buildCheckpointPreviewList(
          (fakeRoute.paths || []).map(buildFakeRoutePathCheckpoint),
          JSON_CHECKPOINT_PREVIEW_LIMITS.pathCount
        ),
        failedPaths: buildCheckpointPreviewList(
          (fakeRoute.failedPaths || []).map(buildFakeRoutePathCheckpoint),
          JSON_CHECKPOINT_PREVIEW_LIMITS.pathCount
        ),
        occupiedKeysPreview: buildCheckpointPreviewList(
          fakeRoute.occupiedKeys || [],
          JSON_CHECKPOINT_PREVIEW_LIMITS.occupiedKeyCount
        )
      }
    }
  }

  const collectMazeOccupancy = (mazeGeneratorInput = null) => {
    if (!mazeGeneratorInput) return { occupiedCellMap: new Map(), occupiedCells: [] }

    const occupiedCellMap = new Map()

    const pushCell = (cell = {}, source = "unknown") => {
      if (!Number.isInteger(cell.row) || !Number.isInteger(cell.col)) return

      const key = cell.key || cellKey(cell.row, cell.col)

      if (!occupiedCellMap.has(key)) {
        occupiedCellMap.set(key, {
          key,
          row: cell.row,
          col: cell.col,
          sources: [source]
        })
        return
      }

      const current = occupiedCellMap.get(key)
      if (!current.sources.includes(source)) {
        current.sources.push(source)
      }
    }

      ; (mazeGeneratorInput.route?.cells || []).forEach((cell) => pushCell(cell, "route"))

      ; (mazeGeneratorInput.fakeRoute?.paths || []).forEach((path) => {
        ; (path.cells || []).forEach((cell) => pushCell(cell, "fake-route"))
      })

    return {
      occupiedCellMap,
      occupiedCells: Array.from(occupiedCellMap.values())
    }
  }

  const buildMazeWallMap = (mazeGeneratorInput = null) => {
    if (!mazeGeneratorInput) return new Map()

    const wallMap = new Map()

    const ensureCell = (cell = {}) => {
      if (!Number.isInteger(cell.row) || !Number.isInteger(cell.col)) return null

      const key = cell.key || cellKey(cell.row, cell.col)

      if (!wallMap.has(key)) {
        wallMap.set(key, {
          key,
          row: cell.row,
          col: cell.col,
          open: {
            up: false,
            right: false,
            down: false,
            left: false
          }
        })
      }

      return wallMap.get(key)
    }

    const connectCells = (fromCell = null, toCell = null) => {
      if (!fromCell || !toCell) return

      const direction = buildDirectionBetween(fromCell, toCell)
      const opposite = getOppositeDirection(direction)

      if (!direction || !opposite) return

      const fromState = ensureCell(fromCell)
      const toState = ensureCell(toCell)

      if (!fromState || !toState) return

      fromState.open[direction] = true
      toState.open[opposite] = true
    }

    const connectCellList = (cells = []) => {
      cells.forEach((cell) => ensureCell(cell))

      for (let index = 0; index < cells.length - 1; index += 1) {
        connectCells(cells[index], cells[index + 1])
      }
    }

    connectCellList(mazeGeneratorInput.route?.cells || [])

      ; (mazeGeneratorInput.fakeRoute?.paths || []).forEach((path) => {
        const startCell = path.startCell || null
        const pathCells = path.cells || []

        if (startCell) {
          ensureCell(startCell)
        }

        if (startCell && pathCells.length > 0) {
          connectCells(startCell, pathCells[0])
        }

        connectCellList(pathCells)
      })

    const entry = mazeGeneratorInput.entry
    const exit = mazeGeneratorInput.exit

    const applyOpening = (selection = null) => {
      if (!selection || !Number.isInteger(selection.row) || !Number.isInteger(selection.col)) return

      const current = ensureCell(selection)
      if (!current) return

      if (selection.side === "top") current.open.up = true
      if (selection.side === "right") current.open.right = true
      if (selection.side === "bottom") current.open.down = true
      if (selection.side === "left") current.open.left = true
    }

    applyOpening(entry)
    applyOpening(exit)

    return wallMap
  }

  const buildOuterFrameLines = ({
    rows = 0,
    cols = 0,
    cellSize = 24,
    padding = 0,
    entry = null,
    exit = null
  }) => {
    const minX = padding
    const minY = padding
    const maxX = padding + cols * cellSize
    const maxY = padding + rows * cellSize

    const openingsBySide = {
      top: [],
      right: [],
      bottom: [],
      left: []
    }

    const addOpening = (selection = null) => {
      if (!selection) return
      if (!Number.isInteger(selection.row) || !Number.isInteger(selection.col)) return
      if (!["top", "right", "bottom", "left"].includes(selection.side)) return

      if (selection.side === "top" || selection.side === "bottom") {
        const start = padding + selection.col * cellSize
        const end = start + cellSize
        openingsBySide[selection.side].push([start, end])
        return
      }

      const start = padding + selection.row * cellSize
      const end = start + cellSize
      openingsBySide[selection.side].push([start, end])
    }

    const mergeRanges = (ranges = []) => {
      if (ranges.length === 0) return []

      const sorted = [...ranges].sort((a, b) => a[0] - b[0])
      return sorted.reduce((merged, current) => {
        if (merged.length === 0) {
          merged.push([...current])
          return merged
        }

        const last = merged[merged.length - 1]
        if (current[0] <= last[1]) {
          last[1] = Math.max(last[1], current[1])
          return merged
        }

        merged.push([...current])
        return merged
      }, [])
    }

    const buildSideSegments = (side, sideStart, sideEnd) => {
      const mergedOpenings = mergeRanges(openingsBySide[side] || [])
      const segments = []
      let cursor = sideStart

      mergedOpenings.forEach(([openStart, openEnd]) => {
        const clippedStart = Math.max(sideStart, openStart)
        const clippedEnd = Math.min(sideEnd, openEnd)

        if (cursor < clippedStart) {
          segments.push([cursor, clippedStart])
        }

        cursor = Math.max(cursor, clippedEnd)
      })

      if (cursor < sideEnd) {
        segments.push([cursor, sideEnd])
      }

      return segments
    }

    const lineForSegment = (side, start, end) => {
      if (end <= start) return null

      if (side === "top") {
        return `<line x1="${start}" y1="${minY}" x2="${end}" y2="${minY}" />`
      }

      if (side === "right") {
        return `<line x1="${maxX}" y1="${start}" x2="${maxX}" y2="${end}" />`
      }

      if (side === "bottom") {
        return `<line x1="${start}" y1="${maxY}" x2="${end}" y2="${maxY}" />`
      }

      if (side === "left") {
        return `<line x1="${minX}" y1="${start}" x2="${minX}" y2="${end}" />`
      }

      return null
    }

    addOpening(entry)
    addOpening(exit)

    const frameLines = []

    buildSideSegments("top", minX, maxX).forEach(([start, end]) => {
      const line = lineForSegment("top", start, end)
      if (line) frameLines.push(line)
    })

    buildSideSegments("right", minY, maxY).forEach(([start, end]) => {
      const line = lineForSegment("right", start, end)
      if (line) frameLines.push(line)
    })

    buildSideSegments("bottom", minX, maxX).forEach(([start, end]) => {
      const line = lineForSegment("bottom", start, end)
      if (line) frameLines.push(line)
    })

    buildSideSegments("left", minY, maxY).forEach(([start, end]) => {
      const line = lineForSegment("left", start, end)
      if (line) frameLines.push(line)
    })

    return frameLines
  }

  const buildFrameLabelSvg = (
    selection = null,
    labelText = "",
    previewConfig = ANSWER_PREVIEW_CONFIG,
    gridSize = { rows: 0, cols: 0 }
  ) => {
    if (!selection || !labelText) return ""

    const {
      cellSize,
      padding,
      frameLabelColor,
      frameLabelFontSize,
      frameLabelFontWeight,
      frameLabelOffset
    } = previewConfig

    const gridRows = gridSize.rows || 0
    const gridCols = gridSize.cols || 0

    const frameMinX = padding
    const frameMinY = padding
    const frameMaxX = padding + gridCols * cellSize
    const frameMaxY = padding + gridRows * cellSize

    const centerX = padding + selection.col * cellSize + cellSize / 2
    const centerY = padding + selection.row * cellSize + cellSize / 2

    let x = centerX
    let y = centerY
    let textAnchor = "middle"
    let dominantBaseline = "middle"

    if (selection.side === "top") {
      x = centerX
      y = frameMinY - frameLabelOffset
      textAnchor = "middle"
      dominantBaseline = "middle"
    }

    if (selection.side === "bottom") {
      x = centerX
      y = frameMaxY + frameLabelOffset
      textAnchor = "middle"
      dominantBaseline = "middle"
    }

    if (selection.side === "left") {
      x = frameMinX - frameLabelOffset
      y = centerY
      textAnchor = "end"
      dominantBaseline = "middle"
    }

    if (selection.side === "right") {
      x = frameMaxX + frameLabelOffset
      y = centerY
      textAnchor = "start"
      dominantBaseline = "middle"
    }

    return `
      <text
        x="${x}"
        y="${y}"
        fill="${frameLabelColor}"
        font-size="${frameLabelFontSize}"
        font-weight="${frameLabelFontWeight}"
        text-anchor="${textAnchor}"
        dominant-baseline="${dominantBaseline}"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        ${labelText}
      </text>
    `.trim()
  }

  const buildRouteOverlaySvg = (
    mazeGeneratorInput = null,
    previewConfig = ANSWER_PREVIEW_CONFIG
  ) => {
    const routeCells = mazeGeneratorInput?.route?.cells || []
    if (routeCells.length === 0) return ""

    const {
      cellSize,
      padding,
      routeOverlayColor,
      routeOverlayInset,
      routeOverlayOpacity,
      routeEndpointRadius
    } = previewConfig

    const safeRouteOverlayWidth = Math.max(2, cellSize - routeOverlayInset * 2)

    const buildCenterPoint = (cell = {}) => {
      return {
        x: padding + cell.col * cellSize + cellSize / 2,
        y: padding + cell.row * cellSize + cellSize / 2
      }
    }

    const points = routeCells
      .map((cell) => {
        const centerPoint = buildCenterPoint(cell)
        return `${centerPoint.x},${centerPoint.y}`
      })
      .join(" ")

    if (!points) return ""

    const startPoint = buildCenterPoint(routeCells[0])
    const endPoint = buildCenterPoint(routeCells[routeCells.length - 1])

    return `
      <g
        fill="none"
        stroke="${routeOverlayColor}"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="${routeOverlayOpacity}"
      >
        <polyline
          points="${points}"
          stroke-width="${safeRouteOverlayWidth}"
        />
        <circle
          cx="${startPoint.x}"
          cy="${startPoint.y}"
          r="${routeEndpointRadius}"
          fill="${routeOverlayColor}"
          stroke="none"
        />
        <circle
          cx="${endPoint.x}"
          cy="${endPoint.y}"
          r="${routeEndpointRadius}"
          fill="${routeOverlayColor}"
          stroke="none"
        />
      </g>
    `.trim()
  }

  const buildMazePreviewSvg = (
    mazeGeneratorInput = null,
    { showAnswerRoute = false } = {}
  ) => {
    if (!mazeGeneratorInput?.grid) return ""

    const rows = mazeGeneratorInput.grid.rows || 0
    const cols = mazeGeneratorInput.grid.cols || 0
    if (rows <= 0 || cols <= 0) return ""

    const {
      cellSize,
      wallThickness,
      strokeColor,
      backgroundColor,
      padding,
      frameLabelColor
    } = ANSWER_PREVIEW_CONFIG

    const wallMap = buildMazeWallMap(mazeGeneratorInput)

    const width = cols * cellSize + padding * 2
    const height = rows * cellSize + padding * 2

    const lines = buildOuterFrameLines({
      rows,
      cols,
      cellSize,
      padding,
      entry: mazeGeneratorInput.entry,
      exit: mazeGeneratorInput.exit
    })

    wallMap.forEach((cellState) => {
      const x = padding + cellState.col * cellSize
      const y = padding + cellState.row * cellSize
      const x2 = x + cellSize
      const y2 = y + cellSize

      const isTopEdge = cellState.row === 0
      const isRightEdge = cellState.col === cols - 1
      const isBottomEdge = cellState.row === rows - 1
      const isLeftEdge = cellState.col === 0

      if (!cellState.open.up && !isTopEdge) {
        lines.push(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" />`)
      }

      if (!cellState.open.right && !isRightEdge) {
        lines.push(`<line x1="${x2}" y1="${y}" x2="${x2}" y2="${y2}" />`)
      }

      if (!cellState.open.down && !isBottomEdge) {
        lines.push(`<line x1="${x}" y1="${y2}" x2="${x2}" y2="${y2}" />`)
      }

      if (!cellState.open.left && !isLeftEdge) {
        lines.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y2}" />`)
      }
    })

    const startLabelSvg = buildFrameLabelSvg(
      mazeGeneratorInput.entry,
      "Start !",
      ANSWER_PREVIEW_CONFIG,
      { rows, cols }
    )

    const goalLabelSvg = buildFrameLabelSvg(
      mazeGeneratorInput.exit,
      "Goal !!",
      ANSWER_PREVIEW_CONFIG,
      { rows, cols }
    )

    const routeOverlaySvg = showAnswerRoute
      ? buildRouteOverlaySvg(mazeGeneratorInput, ANSWER_PREVIEW_CONFIG)
      : ""

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${width} ${height}"
        width="${width}"
        height="${height}"
        role="img"
        aria-label="${showAnswerRoute ? "迷路の解答プレビュー" : "迷路の問題プレビュー"}"
      >
        <rect width="${width}" height="${height}" fill="${backgroundColor}" />
        <g
          fill="${frameLabelColor}"
          stroke="none"
        >
          ${startLabelSvg}
          ${goalLabelSvg}
        </g>
        ${routeOverlaySvg}
        <g
          stroke="${strokeColor}"
          stroke-width="${wallThickness}"
          fill="none"
          stroke-linecap="square"
        >
          ${lines.join("")}
        </g>
      </svg>
    `.trim()
  }

  const buildPreviewPayload = (mazeGeneratorInput = null) => {
    if (!mazeGeneratorInput) return null

    const questionSvg = buildMazePreviewSvg(mazeGeneratorInput, {
      showAnswerRoute: false
    })
    const answerSvg = buildMazePreviewSvg(mazeGeneratorInput, {
      showAnswerRoute: true
    })
    const fakePaths = mazeGeneratorInput.fakeRoute?.paths || []

    return {
      kind: "answer",
      svg: answerSvg,
      svgs: {
        question: questionSvg,
        answer: answerSvg
      },
      meta: {
        rows: mazeGeneratorInput.grid?.rows || 0,
        cols: mazeGeneratorInput.grid?.cols || 0,
        routeCellCount: mazeGeneratorInput.route?.cellCount || 0,
        fakePathCount: fakePaths.length,
        generatedAt: new Date().toISOString()
      }
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

  // 
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

    if (persisted.finalizedMazeInput) {
      root.dataset.finalizedMazeInput = persisted.finalizedMazeInput
    } else {
      delete root.dataset.finalizedMazeInput
    }

    if (persisted.mazeGeneratorInput) {
      root.dataset.mazeGeneratorInput = persisted.mazeGeneratorInput
      root.dataset.generatorReady = "true"
      root.dataset.previewReady = "true"
    } else {
      delete root.dataset.mazeGeneratorInput
      root.dataset.generatorReady = "false"
      delete root.dataset.previewReady
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
      finalizedStatusLabel.textContent = persisted.finalizedMazeInput ? "確定済み" : "未確定"
    }

    if (finalizedJsonPreview) {
      let finalizedPreview = null

      try {
        finalizedPreview = persisted.finalizedMazeInput
          ? JSON.parse(persisted.finalizedMazeInput)
          : null
      } catch (error) {
        finalizedPreview = null
      }

      finalizedJsonPreview.textContent = finalizedPreview
        ? JSON.stringify(buildFinalizedJsonCheckpoint(finalizedPreview), null, 2)
        : "未確定"
    }

    if (generatorStatusLabel) {
      generatorStatusLabel.textContent = persisted.mazeGeneratorInput ? "生成済み" : "未生成"
    }

    if (generatorJsonPreview) {
      let generatorPreview = null

      try {
        generatorPreview = persisted.mazeGeneratorInput
          ? JSON.parse(persisted.mazeGeneratorInput)
          : null
      } catch (error) {
        generatorPreview = null
      }

      generatorJsonPreview.textContent = generatorPreview
        ? JSON.stringify(buildGeneratorJsonCheckpoint(generatorPreview), null, 2)
        : "未生成"
    }
  }
  // 

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

    if (event.pointerType === "touch" && state.mode === "draw") {
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

    if (!cell) return
    confirmSelectionCell(cell)
  })

  grid.addEventListener("pointercancel", () => {
    stopRouteDraw()
    clearPreview()
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
  // 以下は生成されるJSONをブラウザで取得時に追加
  bindJsonCopyButtons()
  syncJsonCopyButtonsState()
}

const initMazePreviewPage = () => {
  const previewRoot = document.querySelector("[data-maze-preview-root]")
  const printQuestionRoot = document.querySelector("[data-maze-print-question-root]")
  const printAnswerRoot = document.querySelector("[data-maze-print-answer-root]")

  if (!previewRoot && !printQuestionRoot && !printAnswerRoot) return

  const previewPageRoot =
    previewRoot ||
    printQuestionRoot ||
    printAnswerRoot

  if (previewPageRoot.dataset.mazePreviewInitialized === "true") return
  previewPageRoot.dataset.mazePreviewInitialized = "true"

  const payload = loadMazePreviewPayload()
  const previewKind = new URLSearchParams(window.location.search).get("kind") || "answer"
  const previewSvg = payload?.svgs?.[previewKind] || payload?.svg || ""

  const applySvgToRoot = (targetRoot, svgMarkup, { fillHeight = false } = {}) => {
    if (!targetRoot) return false
    if (!svgMarkup) return false

    targetRoot.innerHTML = svgMarkup

    const svgElement = targetRoot.querySelector("svg")
    if (!svgElement) return true

    svgElement.style.display = "block"
    svgElement.style.width = "100%"
    svgElement.style.maxWidth = "100%"
    svgElement.style.maxHeight = "100%"
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet")

    if (fillHeight) {
      svgElement.style.height = "100%"
    } else {
      svgElement.style.height = "auto"
    }

    return true
  }

  const renderEmptyState = () => {
    const emptyHtml = `
      <div class="text-center text-sm leading-6 text-slate-500">
        表示できるプレビューが見つかりませんでした。<br>
        迷路エディタからもう一度 preview を開いてください。
      </div>
    `

    if (previewRoot) {
      previewRoot.innerHTML = emptyHtml
    }

    if (printQuestionRoot) {
      printQuestionRoot.innerHTML = emptyHtml
    }

    if (printAnswerRoot) {
      printAnswerRoot.innerHTML = emptyHtml
    }
  }

  if (!payload) {
    renderEmptyState()
    return
  }

  if (previewRoot) {
    const rendered = applySvgToRoot(previewRoot, previewSvg, { fillHeight: false })
    if (!rendered) {
      previewRoot.innerHTML = `
        <div class="text-center text-sm leading-6 text-slate-500">
          表示できるプレビューが見つかりませんでした。<br>
          迷路エディタからもう一度 preview を開いてください。
        </div>
      `
    }
  }

  if (printQuestionRoot) {
    applySvgToRoot(printQuestionRoot, payload?.svgs?.question || "", { fillHeight: true })
  }

  if (printAnswerRoot) {
    applySvgToRoot(printAnswerRoot, payload?.svgs?.answer || "", { fillHeight: true })
  }

  const gridSize = document.querySelector("[data-preview-grid-size]")
  const routeCount = document.querySelector("[data-preview-route-count]")
  const fakeCount = document.querySelector("[data-preview-fake-count]")

  if (gridSize) {
    gridSize.textContent = `${payload.meta.rows} × ${payload.meta.cols}`
  }

  if (routeCount) {
    routeCount.textContent = `${payload.meta.routeCellCount}セル`
  }

  if (fakeCount) {
    fakeCount.textContent = `${payload.meta.fakePathCount}本`
  }

  const editorState = loadMazeEditorState()
  const printOptions = editorState?.printOptions || {}

  const hasMeta = Boolean(printOptions.useMazeTitle || printOptions.useMazeComment)
  const hasFeedback = Boolean(printOptions.useMazeComment || printOptions.useSolverImpression)

  document.querySelectorAll("[data-maze-print-sheet]").forEach((sheet) => {
    sheet.classList.toggle("has-meta", hasMeta)
    sheet.classList.toggle("has-feedback", hasFeedback)
  })

  document.querySelectorAll("[data-maze-print-title-row]").forEach((element) => {
    element.classList.toggle("hidden", !printOptions.useMazeTitle)
  })

  document.querySelectorAll("[data-maze-print-title]").forEach((element) => {
    element.textContent = printOptions.mazeTitle || ""
  })

  document.querySelectorAll("[data-maze-print-comment-row]").forEach((element) => {
    element.classList.toggle("hidden", !printOptions.useMazeComment)
  })

  document.querySelectorAll("[data-maze-print-comment]").forEach((element) => {
    element.textContent = printOptions.mazeComment || ""
  })

  document.querySelectorAll("[data-maze-print-impression-row]").forEach((element) => {
    element.classList.toggle("hidden", !printOptions.useSolverImpression)
  })
}

const initMazePage = () => {
  initMazeCollapsibles()
  initMazeEntryExitSelect()
  initMazePreviewPage()
}

document.addEventListener("turbo:load", initMazePage)
