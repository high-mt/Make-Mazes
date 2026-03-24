class MazePreviewsController < ApplicationController
  ALLOWED_KINDS = %w[question answer print].freeze

  def show
    @preview_kind = ALLOWED_KINDS.include?(params[:kind]) ? params[:kind] : "question"
  end
end
