class MazesController < ApplicationController
  def new
    @maze_rows = 40
    @maze_cols = 40
  end
end
