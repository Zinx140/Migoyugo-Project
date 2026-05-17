class_name VSPlayerPanel
extends GridContainer

@onready var placingMigoSound = get_tree().current_scene.get_node("placingMigoEffect")
@onready var invalidMigoSound = get_tree().current_scene.get_node("invalidMigoEffect")

var board = MainHelper.create_empty_board();
var currentPlayer = Constants.WHITE;
var isOver = false;

func _ready() -> void:
	columns = Constants.BOARD_SIZE
	init_board_buttons()

func _on_cell_pressed(row, col):
	if (isOver): return
	
	var result = MainHelper.makeMove(board, row, col, currentPlayer)
	
	if (result['isValid']):
		placingMigoSound.play()
		board = result['board']
		render_board()
		currentPlayer = getOpponent(currentPlayer)
	else:
		invalidMigoSound.play()
		
	if result['winner'] != "":
		isOver = true;
		print(result['winner'], ' Win!')
	

func resetBoard():
	board = MainHelper.create_empty_board();
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
			
			if (!btn): return

			var cell = board[row][col]

			# reset texture dulu
			btn.texture_normal = load(CompHelper.getTilesPath(cell))
