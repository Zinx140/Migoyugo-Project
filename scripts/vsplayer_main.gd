class_name VSPlayerPanel
extends GridContainer

@onready var placingMigoSound = get_tree().current_scene.get_node("placingMigoEffect")
@onready var invalidMigoSound = get_tree().current_scene.get_node("invalidMigoEffect")
@onready var blackTurnComp = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/BlackTurn")
@onready var whiteTurnComp = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/WhiteTurn")
@onready var blackWin = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/BWin")
@onready var whiteWin = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/WWin")
@onready var playAgainBtn = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/PlayAgainBtn")
@onready var exitBtn = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/ExitBtn")
@onready var backBtn = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/BackButton")
@onready var boardContainer = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/BoardContainer")
@onready var boardGridContainer = get_tree().current_scene.get_node("VSPlayerNode/VSPlayerCanvasLayer/BoardContainer/BoardGridContainer")

var board = MainHelper.create_empty_board();
var currentPlayer = Constants.WHITE;
var isOver = false;

func _ready() -> void:
	columns = Constants.BOARD_SIZE
	init_board_buttons()

func renderTurnComp():
	if currentPlayer == Constants.WHITE:
		whiteTurnComp.visible = true
		blackTurnComp.visible = false
	else:
		whiteTurnComp.visible = false
		blackTurnComp.visible = true

func _on_cell_pressed(row, col):
	if isOver:
		return

	var playedPlayer = currentPlayer
	var result = MainHelper.makeMove(board, row, col, playedPlayer)

	if result["isValid"]:
		placingMigoSound.play()
		board = result["board"]
		render_board()

		if result["winner"] != "":
			isOver = true

			var igo_cells = MainHelper.getIgoBoard(board, row, col, playedPlayer)
			mark_igo_cells(igo_cells)

			print(igo_cells)
			print(result["winner"], " Win!")
			showWinMenu(result["winner"])
			return

		currentPlayer = getOpponent(currentPlayer)
		renderTurnComp()
	else:
		invalidMigoSound.play()

func showWinMenu(winner):
	if (winner == "W"):
		whiteWin.visible = true
	else:
		blackWin.visible = true

	backBtn.visible= false
	boardContainer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	boardGridContainer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	whiteTurnComp.visible= false
	blackTurnComp.visible= false
	playAgainBtn.visible = true
	exitBtn.visible = true

func resetBoard():
	clear_igo_marks()
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

func mark_igo_cells(igo_cells):
	for cell in igo_cells:
		mark_cell(cell['row'], cell['col'])

func mark_cell(row: int, col: int) -> void:
	var index = row * Constants.BOARD_SIZE + col
	var btn = get_child(index) as TextureButton

	if not btn: return

	# Cek apakah button ini sudah punya border panel sebelumnya agar tidak double
	var existing_border = btn.get_node_or_null("IgoBorder")
	if existing_border:
		return # Sudah ditandai, tidak perlu ditambah lagi

	# Membuat Panel baru sebagai border merah tebal
	var border_panel = Panel.new()
	border_panel.name = "IgoBorder" # Diberi nama unik agar mudah dicari/dihapus
	border_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	border_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Setup StyleBoxFlat untuk border merah tebal
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0, 0, 0, 0) # Tengahnya transparan
	style_box.border_color = Color.RED     # Warna border merah
	style_box.set_border_width_all(6)      # Ketebalan border 6 pixel

	border_panel.add_theme_stylebox_override("panel", style_box)
	btn.add_child(border_panel)

func clear_igo_marks() -> void:
	for child in get_children():
		var btn = child as TextureButton

		if not btn:
			continue

		var existing_border = btn.get_node_or_null("IgoBorder")
	
