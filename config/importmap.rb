# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin_all_from "app/javascript/maze", under: "maze"
pin "maze/generation_presets/maze_generation_preset_mvp01", to: "maze/generation_presets/maze_generation_preset_mvp01.js"
