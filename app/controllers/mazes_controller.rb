class MazesController < ApplicationController
  def new
    @maze_rows = 20
    @maze_cols = 25
  end
end
