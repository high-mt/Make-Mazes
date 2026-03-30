import "@hotwired/turbo-rails"
// import "controllers"
import { initMazeCollapsibles } from "maze/maze_collapsibles"
import { initMazeEditorPage } from "maze/maze_editor_page"
import { initMazePreviewPage } from "maze/maze_preview_page"

const initMazePage = () => {
  initMazeCollapsibles()
  initMazeEditorPage()
  initMazePreviewPage()
}

document.addEventListener("turbo:load", initMazePage)