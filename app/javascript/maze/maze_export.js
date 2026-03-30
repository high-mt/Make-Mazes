// export
export const sanitizeMazeFileNamePart = (value = "") => {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export const buildMazeDownloadFileName = ({
  kind = "question",
  title = "",
  generatedAt = ""
} = {}) => {
  const safeTitle = sanitizeMazeFileNamePart(title) || "make-mazes"
  const safeKind = kind === "answer" ? "answer" : "question"

  const baseDate = generatedAt ? new Date(generatedAt) : new Date()
  const isValidDate = !Number.isNaN(baseDate.getTime())

  const timestamp = isValidDate
    ? [
      baseDate.getFullYear(),
      String(baseDate.getMonth() + 1).padStart(2, "0"),
      String(baseDate.getDate()).padStart(2, "0"),
      "-",
      String(baseDate.getHours()).padStart(2, "0"),
      String(baseDate.getMinutes()).padStart(2, "0")
    ].join("")
    : "export"

  return `${safeTitle}-${safeKind}-${timestamp}.png`
}

export const convertSvgMarkupToPngBlob = async (
  svgMarkup = "",
  { scale = 2, backgroundColor = "#ffffff" } = {}
) => {
  if (!svgMarkup) return null

  const parser = new DOMParser()
  const parsedSvg = parser.parseFromString(svgMarkup, "image/svg+xml")
  const svgElement = parsedSvg.documentElement

  if (!svgElement || svgElement.nodeName === "parsererror") {
    throw new Error("SVGの解析に失敗しました。")
  }

  if (!svgElement.getAttribute("xmlns")) {
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  }

  const viewBox = svgElement.getAttribute("viewBox") || ""
  const viewBoxParts = viewBox.split(/\s+/).map(Number)

  const rawWidth =
    Number(svgElement.getAttribute("width")) || Number(viewBoxParts[2])
  const rawHeight =
    Number(svgElement.getAttribute("height")) || Number(viewBoxParts[3])

  if (!rawWidth || !rawHeight) {
    throw new Error("SVGサイズの取得に失敗しました。")
  }

  const width = Math.max(1, Math.round(rawWidth))
  const height = Math.max(1, Math.round(rawHeight))

  const serializedSvg = new XMLSerializer().serializeToString(svgElement)
  const svgBlob = new Blob(
    [serializedSvg],
    { type: "image/svg+xml;charset=utf-8" }
  )
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("SVG画像の読み込みに失敗しました。"))
      img.src = svgUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Canvasの初期化に失敗しました。")
    }

    context.fillStyle = backgroundColor
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png")
    })

    if (!pngBlob) {
      throw new Error("PNG変換に失敗しました。")
    }

    return pngBlob
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export const downloadBlobFile = (blob, fileName = "maze.png") => {
  if (!blob) return

  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(blobUrl)
}

export const showDownloadButtonFeedback = (button, label = "保存開始") => {
  if (!button) return

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim()
  }

  if (button.downloadFeedbackTimer) {
    window.clearTimeout(button.downloadFeedbackTimer)
  }

  button.textContent = label

  button.downloadFeedbackTimer = window.setTimeout(() => {
    button.textContent = button.dataset.defaultLabel || "PNGをダウンロード"
  }, 1200)
}
