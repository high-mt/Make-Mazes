class MazesController < ApplicationController
  def new
    @maze_rows = 20
    @maze_cols = 30
  end
end
