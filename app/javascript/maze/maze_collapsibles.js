// 折りたたみ　UI
export const initMazeCollapsibles = () => {
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
