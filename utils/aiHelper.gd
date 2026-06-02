extends Node

var winner: String = ""
var currentPlayer = Constants.WHITE;
var TRACE_CANVAS = null;
var TRACE_CTX = null;


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

#AI: MINIMAX + ALPHA BETA + PRIORITY QUEUE

func format_move(move) -> String:
	if not move or (typeof(move) == TYPE_DICTIONARY and move.is_empty()) or not move.has("row"): 
		return "-"
	return str(move.row + 1) + "-" + str(move.col + 1)


func format_score(value) -> String:
	if value == INF: 
		return "+∞"
	if value == -INF: 
		return "-∞"
	if value == null: 
		return "?"
	return str(value)

func format_trace_node(node: Dictionary) -> String:
	var move_text = format_move(node.move) if node.get("move") else "START"
	var score_text = format_score(node.score)
	
	var priority_text = ""
	if node.get("priority") != null:
		priority_text = " | priority=" + format_score(node.priority)
		
	var alpha_text = "α:" + format_score(node.alphaStart) + "→" + format_score(node.alphaEnd)
	var beta_text = "β:" + format_score(node.betaStart) + "→" + format_score(node.betaEnd)
	
	var reason_text = " | " + node.reason if node.get("reason") else ""
	var prune_text = " | ✂ PRUNED: " + node.pruneReason if node.get("pruned") else ""

	return "[" + str(node.nodeType) + "] player=" + str(node.player) + \
		" depth=" + str(node.depth) + " move=" + move_text + \
		" score=" + score_text + priority_text + " | " + \
		alpha_text + " | " + beta_text + reason_text + prune_text

func create_trace_node(params: Dictionary) -> Dictionary:
	var move = params.get("move", null)
	var player = params.get("player")
	var alpha = params.get("alpha")
	var beta = params.get("beta")
	
	# Ambil data koordinat move jika move tidak null/kosong
	var move_data = null
	if move and move.has("row") and move.has("col"):
		move_data = { "row": move.row, "col": move.col }

	return {
		"type": params.get("type"),
		"nodeType": "MAX" if player == Constants.AI_PLAYER else "MIN",
		"player": player,
		"depth": params.get("depth"),
		"move": move_data,
		"priority": params.get("priority", null), # Menggunakan null sebagai nilai default jika tidak ada
		"score": null,
		"currentBest": null,
		"alphaStart": alpha,
		"betaStart": beta,
		"alphaEnd": alpha,
		"betaEnd": beta,
		"reason": "",
		"pruned": false,
		"pruneReason": "",
		"children": []
	}



func init_minimax_canvas() -> void:
	if not Constants.TRACE_CANVAS_ENABLED:
		return

	var wrapper = get_parent() as ScrollContainer
	
	if not wrapper:
		push_error("Error: Pastikan Node ini adalah anak (child) langsung dari sebuah ScrollContainer!")
		return
		

	wrapper.custom_minimum_size = Vector2(1000, 500)

	TRACE_CANVAS = self
	
	TRACE_CANVAS.custom_minimum_size = Vector2(2000, 1200)
	
	TRACE_CTX = self
	
	print("Canvas Minimax berhasil diinisialisasi menggunakan hierarki Node Godot!")



func print_trace_branch(node: Dictionary, prefix: String, is_last: bool, level: int) -> void:
	if level > Constants.TRACE_MAX_PRINT_DEPTH + 1:
		return

	var connector = "└── " if is_last else "├── "
	print(prefix + connector + format_trace_node(node))

	var next_prefix = prefix + ("    " if is_last else "│   ")
	var children = node.children.slice(0, Constants.TRACE_MAX_CHILDREN_PER_NODE)

	for index in range(children.size()):
		var child = children[index]
		var child_is_last = (index == children.size() - 1)
		print_trace_branch(child, next_prefix, child_is_last, level + 1)

func print_minimax_trace(root: Dictionary) -> void:
	if not Constants.TRACE_MINIMAX:
		return

	#draw_minimax_trace_tree(root)

	# console.clear() tidak ada padanannya di konsol standar Godot.
	# Jika ingin membersihkan layar secara visual di output debug, kamu bisa mencetak baris kosong:
	# for i in range(10): print("")

	print("================ MINIMAX TRACE TREE ================")
	print("AI Player: ",Constants.AI_PLAYER, ", Human Player: ", Constants.HUMAN_PLAYER)
	print("MAX_DEPTH: ", Constants.MAX_DEPTH, ", TOP_K: ", Constants.TOP_K)
	print("Best Move: ", format_move(root.best_move), " | Best Score: ", format_score(root.score))
	print("====================================================")
	print(format_trace_node(root))

	# Di GDScript, .slice(start, end) bersifat eksklusif untuk indeks akhir, 
	# sama seperti JavaScript.
	var children = root.children.slice(0, Constants.TRACE_MAX_CHILDREN_PER_NODE)

	for index in range(children.size()):
		var child = children[index]
		var is_last = (index == children.size() - 1)
		print_trace_branch(child, "", is_last, 1)

	#draw_minimax_trace_tree(root)


func make_ai_move(board) -> void:
	if not Constants.AI_ENABLED or winner or currentPlayer != Constants.AI_PLAYER:
		return

	var best_move = get_best_move_for_ai(board)

	if not best_move:
		MainHelper.updateInfo("AI has no valid move.")
		return

	MainHelper.makeMove(board,best_move.row, best_move.col, Constants.AI_PLAYER)


func get_best_move_for_ai(source_board) -> Dictionary:
	var moves = get_top_moves(source_board, Constants.AI_PLAYER, Constants.TOP_K)

	var best_move = {} # Menggunakan Dictionary kosong sebagai pengganti null objek
	var best_score = -INF

	var trace_root = create_trace_node({
		"type": "ROOT",
		"player": Constants.AI_PLAYER,
		"depth": Constants.MAX_DEPTH,
		"move": {},
		"alpha": -INF,
		"beta": INF
	})

	for item in moves:
		var move = item.element

		var trace_child = create_trace_node({
			"type": "AI_CANDIDATE",
			"player": Constants.AI_PLAYER,
			"depth": Constants.MAX_DEPTH,
			"move": move,
			"alpha": -INF,
			"beta": INF,
			"priority": item.priority
		})

		trace_root.children.append(trace_child)

		var score: float
		if move.has("winner") and move.winner:
			score = 100000.0
		else:
			score = mini_max_alpha_beta_pruning(
				move.board,
				Constants.MAX_DEPTH - 1,
				-INF,
				INF,
				Constants.HUMAN_PLAYER,
				trace_child
			)

		trace_child.score = score

		if score > best_score:
			best_score = score
			best_move = move

	trace_root.score = best_score
	trace_root.best_move = best_move

	print_minimax_trace(trace_root)

	return best_move

func is_board_full(source_board: Array) -> bool:
	for row in range(source_board.size()):
		for col in range(source_board[row].size()):
			if source_board[row][col] == Constants.EMPTY:
				return false
	return true

func evaluate_wego_board(source_board: Array) -> float:
	var result = MainHelper.getWegoResult(source_board)
	
	# Fallback jika result kosong atau tidak valid
	if result.is_empty() or not result.has("scores"):
		return 0.0

	var ai_score = result.scores.get(Constants.AI_PLAYER, 0)
	var human_score = result.scores.get(Constants.HUMAN_PLAYER, 0)

	if ai_score > human_score: 
		return 100000.0
	if human_score > ai_score: 
		return -100000.0

	return 0.0

func mini_max_alpha_beta_pruning(
	source_board,
	depth: int,
	alpha: float,
	beta: float,
	player,
	trace_node = null
) -> float:
	
	if trace_node:
		trace_node.player = player
		trace_node.depth = depth
		trace_node.alphaStart = alpha
		trace_node.betaStart = beta
		trace_node.nodeType = "MAX" if player == Constants.AI_PLAYER else "MIN"

	if is_board_full(source_board):
		var score = evaluate_wego_board(source_board)
		if trace_node:
			trace_node.reason = "WEGO_BOARD_FULL"
			trace_node.score = score
			trace_node.alphaEnd = alpha
			trace_node.betaEnd = beta
		return score

	if depth == 0:
		var score = evaluate_board(source_board)
		if trace_node:
			trace_node.reason = "DEPTH_LIMIT"
			trace_node.score = score
			trace_node.alphaEnd = alpha
			trace_node.betaEnd = beta
		return score

	var moves = get_top_moves(source_board, player, Constants.TOP_K)

	if moves.size() == 0:
		var score = evaluate_board(source_board)
		if trace_node:
			trace_node.reason = "NO_VALID_MOVES"
			trace_node.score = score
			trace_node.alphaEnd = alpha
			trace_node.betaEnd = beta
		return score

	# --- GILIRAN AI (MAX PLAYER) ---
	if player == Constants.AI_PLAYER:
		var best_score = -INF

		for item in moves:
			var move = item.element
			var child_trace = create_trace_node({
				"type": "MAX_CHILD",
				"player": player,
				"depth": depth,
				"move": move,
				"alpha": alpha,
				"beta": beta,
				"priority": item.priority
			})

			if trace_node:
				trace_node.children.append(child_trace)

			var score: float
			if move.has("winner") and move.winner:
				score = 100000.0 + depth
			else:
				score = mini_max_alpha_beta_pruning(
					move.board,
					depth - 1,
					alpha,
					beta,
					MainHelper.getOpponent(player),
					child_trace
				)

			child_trace.score = score
			best_score = max(best_score, score)
			alpha = max(alpha, best_score)

			if trace_node:
				trace_node.currentBest = best_score
				trace_node.alphaEnd = alpha
				trace_node.betaEnd = beta

			if beta <= alpha:
				if trace_node:
					trace_node.pruned = true
					trace_node.pruneReason = "beta (" + format_score(beta) + ") <= alpha (" + format_score(alpha) + ")"
				break

		if trace_node:
			trace_node.score = best_score
			trace_node.alphaEnd = alpha
			trace_node.betaEnd = beta

		return best_score

	# --- GILIRAN HUMAN (MIN PLAYER) ---
	var best_score = INF

	for item in moves:
		var move = item.element
		var child_trace = create_trace_node({
			"type": "MIN_CHILD",
			"player": player,
			"depth": depth,
			"move": move,
			"alpha": alpha,
			"beta": beta,
			"priority": item.priority
		})

		if trace_node:
			trace_node.children.append(child_trace)

		var score: float
		if move.has("winner") and move.winner:
			score = -100000.0 - depth
		else:
			score = mini_max_alpha_beta_pruning(
				move.board,
				depth - 1,
				alpha,
				beta,
				MainHelper.getOpponent(player),
				child_trace
			)

		child_trace.score = score
		best_score = min(best_score, score)
		beta = min(beta, best_score)

		if trace_node:
			trace_node.currentBest = best_score
			trace_node.alphaEnd = alpha
			trace_node.betaEnd = beta

		if beta <= alpha:
			if trace_node:
				trace_node.pruned = true
				trace_node.pruneReason = "beta (" + format_score(beta) + ") <= alpha (" + format_score(alpha) + ")"
			break

	if trace_node:
		trace_node.score = best_score
		trace_node.alphaEnd = alpha
		trace_node.betaEnd = beta

	return best_score

func get_top_moves(source_board, player, limit: int = Constants.TOP_K) -> Array:
	var pq = [] # Kita gunakan Array standar sebagai penampung

	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if source_board[row][col] != Constants.EMPTY:
				continue

			var result = MainHelper.simulateMove(source_board, row, col, player)

			if not result.is_valid:
				continue

			var score = evaluate_board(result.board)
			# AI ingin score tertinggi (Max), Human ingin score terendah (Min)
			var priority = score if player == Constants.AI_PLAYER else -score

			# Simpan data move beserta prioritasnya ke dalam array
			pq.append({
				"element": {
					"row": row,
					"col": col,
					"board": result.board,
					"winner": result.winner if result.has("winner") else null
				},
				"priority": priority
			})

	# Urutkan array berdasarkan prioritas secara descending (terbesar ke terkecil)
	pq.sort_custom(func(a, b): return a.priority > b.priority)

	# Ambil data sebanyak 'limit' (TOP_K)
	var moves = []
	var take_count = min(pq.size(), limit)
	
	for i in range(take_count):
		moves.append(pq[i])

	return moves

func evaluate_board(source_board) -> float:
	var score = 0.0

	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			var token = source_board[row][col]
			if token == Constants.EMPTY:
				continue

			var owner = MainHelper.getTokenOwner(token)
			var token_score = MainHelper.getTokenScore(token) + Constants.SCORE_TILES[row][col]

			if owner == Constants.AI_PLAYER:
				score += token_score
			else:
				score -= token_score

	return score
