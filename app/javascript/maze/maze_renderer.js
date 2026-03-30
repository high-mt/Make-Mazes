// preview SVG / payload renderer
export const createMazeRenderer = ({
  cellKey,
  buildDirectionBetween,
  getOppositeDirection,
  previewConfig
} = {}) => {
  const ANSWER_PREVIEW_CONFIG = previewConfig || {
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
      routeOverlayClass,
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
        class="${routeOverlayClass || ""}"
        data-maze-route-overlay="true"
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
      "Start",
      ANSWER_PREVIEW_CONFIG,
      { rows, cols }
    )

    const goalLabelSvg = buildFrameLabelSvg(
      mazeGeneratorInput.exit,
      "Goal",
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
          class="maze-preview-frame-labels"
          fill="${frameLabelColor}"
          stroke="none"
        >
          ${startLabelSvg}
          ${goalLabelSvg}
        </g>
        ${routeOverlaySvg}
        <g
          class="maze-preview-wall-lines"
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

  return {
    buildMazeWallMap,
    buildMazePreviewSvg,
    buildPreviewPayload
  }
}
