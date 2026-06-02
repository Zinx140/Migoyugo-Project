class_name VSAIPanel
extends GridContainer

@onready var placingMigoSound = get_tree().current_scene.get_node("placingMigoEffect")
@onready var invalidMigoSound = get_tree().current_scene.get_node("invalidMigoEffect")
@onready var blackTurnComp = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/BlackTurn")
@onready var whiteTurnComp = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/WhiteTurn")

@onready var ai_helper = preload("res://utils/aiHelper.gd").new()

var board = MainHelper.create_empty_board()
var currentPlayer = Constants.WHITE
var isOver = false

var AI_PLAYER = Constants.BLACK

func _ready() -> void:
	columns = Constants.BOARD_SIZE
	init_board_buttons()
	renderTurnComp()


func renderTurnComp():
	if currentPlayer == Constants.WHITE:
		whiteTurnComp.visible = true
		blackTurnComp.visible = false		
	else:
		whiteTurnComp.visible = false
		blackTurnComp.visible = true


func _on_cell_pressed(row, col):
	# 🚫 block kalau game over atau AI turn
	if isOver or currentPlayer == AI_PLAYER:
		return
	
	var result = MainHelper.makeMove(board, row, col, currentPlayer)
	
	if result['isValid']:
		placingMigoSound.play()
		board = result['board']
		render_board()

		currentPlayer = getOpponent(currentPlayer)
		renderTurnComp()

		# 🤖 AI jalan setelah player
		if not isOver:
			await get_tree().create_timer(0.3).timeout
			ai_turn()

	else:
		invalidMigoSound.play()
		
	if result['winner'] != "":
		isOver = true
		print(result['winner'], " Win!")


# 🤖 AI LOGIC LANGSUNG DI SINI
func ai_turn():
	if isOver:
		return

	var move = ai_helper.get_best_move_for_ai(board)

	if move == null:
		print("AI tidak punya langkah")
		return

	var result = MainHelper.makeMove(board, move.row, move.col, AI_PLAYER)

	if result["isValid"]:
		placingMigoSound.play()
		board = result["board"]
		render_board()

		# 🔥 highlight langkah AI
		mark_cell(move.row, move.col)

		currentPlayer = getOpponent(currentPlayer)
		renderTurnComp()

		if result["winner"] != "":
			isOver = true
			print(result["winner"], " Win!")


func resetBoard():
	board = MainHelper.create_empty_board()
	render_board()


func getOpponent(player):
	return Constants.BLACK if player == Constants.WHITE else Constants.WHITE


func init_board_buttons():
	for child in get_children():
		child.queue_free()

	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):

			var btn = TextureButton.new()

			btn.name = MainHelper.get_cell_id(row, col)
			btn.custom_minimum_size = Vector2(120, 120)

			btn.texture_normal = preload("res://assets/imgs/tile.png")
			btn.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
			btn.ignore_texture_size = true
			btn.pressed.connect(_on_cell_pressed.bind(row, col))

			add_child(btn)
			

func render_board():
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):

			var index = row * Constants.BOARD_SIZE + col
			var btn = get_child(index) as TextureButton
			
			if !btn: return

			var cell = board[row][col]

			btn.texture_normal = load(CompHelper.getTilesPath(cell))
		

func mark_cell(row: int, col: int) -> void:
	var index = row * Constants.BOARD_SIZE + col
	var btn = get_child(index) as TextureButton
	
	if not btn: return

	var existing_border = btn.get_node_or_null("IgoBorder")
	if existing_border:
		return

	var border_panel = Panel.new()
	border_panel.name = "IgoBorder"
	border_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	border_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0, 0, 0, 0)
	style_box.border_color = Color.RED
	style_box.set_border_width_all(6)

	border_panel.add_theme_stylebox_override("panel", style_box)
	btn.add_child(border_panel)
