class MazesController < ApplicationController
  def new
    @maze_rows = 35
    @maze_cols = 35
  end
end
