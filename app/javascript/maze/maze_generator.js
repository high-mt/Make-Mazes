// maze generation logic
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

export const createMazeGenerator = ({ rows = 0, cols = 0 } = {}) => {
  const cellKey = (row, col) => `${row}-${col}`

  // ここから generator 系関数群
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


  return {
    buildDirectionBetween,
    getOppositeDirection,
    buildMazeGeneratorInput,
    buildFinalizedJsonCheckpoint,
    buildGeneratorJsonCheckpoint
  }
}