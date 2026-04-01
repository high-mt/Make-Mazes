// 初期化処理 preview / print / PNG
import {
  loadMazeEditorState,
  loadMazePreviewPayload
} from "maze/maze_storage"

import {
  buildMazeDownloadFileName,
  convertSvgMarkupToPngBlob,
  downloadBlobFile,
  showDownloadButtonFeedback
} from "maze/maze_export"

export const initMazePreviewPage = () => {
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
    svgElement.style.height = "auto"
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet")

    return true
  }

  const renderEmptyState = () => {
    const emptyHtml = `
      <div class="flex h-full w-full items-center justify-center px-4">
        <div class="text-center text-sm leading-6 text-slate-500">
          表示できるプレビューが見つかりませんでした。<br>
          迷路エディタからもう一度 preview を開いてください。
        </div>
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
        <div class="flex h-full w-full items-center justify-center px-4">
          <div class="text-center text-sm leading-6 text-slate-500">
            表示できるプレビューが見つかりませんでした。<br>
            迷路エディタからもう一度 preview を開いてください。
          </div>
        </div>
      `
    }
  }

  if (printQuestionRoot) {
    applySvgToRoot(printQuestionRoot, payload?.svgs?.question || "", { fillHeight: false })
  }

  if (printAnswerRoot) {
    applySvgToRoot(printAnswerRoot, payload?.svgs?.answer || "", { fillHeight: false })
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

  const normalizedMazeTitle = (printOptions.mazeTitle || "").trim()
  const normalizedMazeComment = (printOptions.mazeComment || "").trim()

  const shouldUseCustomTitle = Boolean(
    printOptions.useMazeTitle && normalizedMazeTitle.length > 0
  )

  const resolvedTitleText = shouldUseCustomTitle
    ? normalizedMazeTitle
    : "Make Mazes!で制作した迷路"

  const shouldShowPoweredBy = true
  const shouldShowComment = Boolean(
    printOptions.useMazeComment && normalizedMazeComment.length > 0
  )

  const hasMeta = true
  const hasFeedback = Boolean(shouldShowComment || printOptions.useSolverImpression)

  document.querySelectorAll("[data-maze-print-sheet]").forEach((sheet) => {
    sheet.classList.toggle("has-meta", hasMeta)
    sheet.classList.toggle("has-feedback", hasFeedback)
  })

  document.querySelectorAll("[data-maze-print-title-row]").forEach((element) => {
    element.classList.remove("hidden")
  })

  document.querySelectorAll("[data-maze-print-title]").forEach((element) => {
    element.textContent = resolvedTitleText
  })

  document.querySelectorAll("[data-maze-print-title-powered]").forEach((element) => {
    element.classList.toggle("hidden", !shouldShowPoweredBy)
  })

  document.querySelectorAll("[data-maze-print-comment-row]").forEach((element) => {
    element.classList.toggle("hidden", !shouldShowComment)
  })

  document.querySelectorAll("[data-maze-print-comment]").forEach((element) => {
    element.textContent = normalizedMazeComment
  })

  document.querySelectorAll("[data-maze-print-impression-row]").forEach((element) => {
    element.classList.toggle("hidden", !printOptions.useSolverImpression)
  })

  const downloadButtons = document.querySelectorAll("[data-maze-download-button]")

  downloadButtons.forEach((button) => {
    if (button.dataset.downloadBound === "true") return

    button.dataset.downloadBound = "true"
    button.dataset.defaultLabel = button.textContent.trim()

    button.addEventListener("click", async () => {
      const kind = button.dataset.mazeDownloadKind === "answer"
        ? "answer"
        : "question"

      const svgMarkup = payload?.svgs?.[kind] || ""
      if (!svgMarkup) {
        showDownloadButtonFeedback(button, "画像なし")
        return
      }

      button.disabled = true

      try {
        const pngBlob = await convertSvgMarkupToPngBlob(svgMarkup, {
          scale: 2,
          backgroundColor: "#ffffff"
        })

        const fileName = buildMazeDownloadFileName({
          kind,
          title: resolvedTitleText,
          generatedAt: payload?.meta?.generatedAt
        })

        downloadBlobFile(pngBlob, fileName)
        showDownloadButtonFeedback(button, "保存開始")
      } catch (error) {
        console.error("Failed to export maze png:", error)
        showDownloadButtonFeedback(button, "失敗")
      } finally {
        button.disabled = false
      }
    })
  })

  const printButton = document.querySelector("[data-maze-print-button]")
  if (printButton && printButton.dataset.printBound !== "true") {
    printButton.dataset.printBound = "true"
    printButton.addEventListener("click", () => {
      window.print()
    })
  }
}
