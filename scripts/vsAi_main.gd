class_name VSAIPanel
extends GridContainer

@onready var placingMigoSound = get_tree().current_scene.get_node("placingMigoEffect")
@onready var invalidMigoSound = get_tree().current_scene.get_node("invalidMigoEffect")
@onready var blackTurnComp = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/BlackTurn")
@onready var whiteTurnComp = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/WhiteTurn")
@onready var blackWin = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/BWin")
@onready var whiteWin = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/WWin")
@onready var playAgainBtn = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/PlayAgainBtn")
@onready var exitBtn = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/ExitBtn")
@onready var backBtn = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/BackButton")
@onready var boardContainer = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/BoardContainer")
@onready var boardGridContainer = get_tree().current_scene.get_node("VSAiNode/VSAiCanvasLayer/BoardContainer/BoardGridContainer")

var board = MainHelper.create_empty_board();
var currentPlayer = Constants.WHITE;
var isOver = false;
var AI_PLAYER = Constants.WHITE
var HUMAN_PLAYER = Constants.BLACK
var isAiThinking = false

func _ready() -> void:
	columns = Constants.BOARD_SIZE
	init_board_buttons()
	set_board_input_enabled(false)

func start_game(human_side) -> void:
	clear_igo_marks()
	HUMAN_PLAYER = human_side
	AI_PLAYER = getOpponent(HUMAN_PLAYER)

	board = MainHelper.create_empty_board()
	currentPlayer = Constants.WHITE # putih selalu mulai dulu
	isOver = false
	isAiThinking = false

	whiteWin.visible = false
	blackWin.visible = false
	playAgainBtn.visible = false
	exitBtn.visible = false
	backBtn.visible = true

	boardContainer.mouse_filter = Control.MOUSE_FILTER_STOP
	boardGridContainer.mouse_filter = Control.MOUSE_FILTER_STOP

	render_board()
	renderTurnComp()

	if currentPlayer == AI_PLAYER:
		isAiThinking = true
		set_board_input_enabled(false)

		await get_tree().create_timer(0.3).timeout
		ai_turn()
	else:
		set_board_input_enabled(true)
		
func set_board_input_enabled(enabled: bool) -> void:
	for child in get_children():
		var btn = child as TextureButton
		
		if btn:
			btn.disabled = not enabled
			btn.mouse_filter = Control.MOUSE_FILTER_STOP if enabled else Control.MOUSE_FILTER_IGNORE
			
func renderTurnComp():
	if currentPlayer == Constants.WHITE:
		whiteTurnComp.visible = true
		blackTurnComp.visible = false		
	else:
		whiteTurnComp.visible = false
		blackTurnComp.visible = true

func _on_cell_pressed(row, col):
	if isOver or isAiThinking or currentPlayer != HUMAN_PLAYER:
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
		
		if not isOver:
			isAiThinking = true
			set_board_input_enabled(false)
			
			await get_tree().create_timer(0.3).timeout
			ai_turn()
	else:
		invalidMigoSound.play()

# 🤖 AI LOGIC LANGSUNG DI SINI
func ai_turn():
	if isOver:
		isAiThinking = false
		set_board_input_enabled(false)
		return
	
	if currentPlayer != AI_PLAYER:
		isAiThinking = false
		set_board_input_enabled(true)
		return

	isAiThinking = true
	set_board_input_enabled(false)
	
	var moves = getMigoCell()
	var move = AiHelper.get_best_move_for_ai(board, moves, AI_PLAYER, HUMAN_PLAYER)

	if move == null or move["row"] == -1 or move["col"] == -1:
		print("AI tidak punya langkah")
		currentPlayer = HUMAN_PLAYER
		renderTurnComp()
		isAiThinking = false
		set_board_input_enabled(true)
		return

	var result = MainHelper.makeMove(board, move["row"], move["col"], AI_PLAYER)

	if not result["isValid"]:
		print("AI memilih langkah invalid: ", move)
		currentPlayer = HUMAN_PLAYER
		renderTurnComp()
		isAiThinking = false
		set_board_input_enabled(true)
		return

	placingMigoSound.play()
	board = result["board"]
	render_board()

	if result["winner"] != "":
		isOver = true
		
		var igo_cells = MainHelper.getIgoBoard(board, move["row"], move["col"], AI_PLAYER)
		mark_igo_cells(igo_cells)
		print(result["winner"], " Win!")
		showWinMenu(result["winner"])
		set_board_input_enabled(false)
		return

	currentPlayer = getOpponent(currentPlayer)
	renderTurnComp()

	isAiThinking = false
	set_board_input_enabled(true)

func getMigoCell():
	var ai_moves = []
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if (board[row][col] != Constants.EMPTY):
				ai_moves.append({
					"row": row,
					"col": col
				})
				
	return ai_moves	

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
		
		if existing_border:
			existing_border.queue_free()
			
