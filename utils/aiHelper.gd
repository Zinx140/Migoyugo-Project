extends Node
class_name AiHelper

static func getImmediateYugo(board, currentPlayer) -> Dictionary:
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue

			var result = MainHelper.simulateMove(
				board,
				row,
				col,
				currentPlayer,
				false
			)

			if !result.isValid:
				continue

			# Jika setelah move ini currentPlayer langsung menang / Igo
			if result.winner == currentPlayer:
				return {
					"found": true,
					"row": row,
					"col": col,
					"score": AIConstants.WIN_SCORE,
				}

	return {
		"found": false,
		"row": -1,
		"col": -1,
		"score": 0,
	}

static func getPossibleCells(moves, board, AI_PLAYER, HUMAN_PLAYER):
	var possible_cells = []
	if (len(moves) < 8):
		if (board[2][2] == Constants.EMPTY):
			possible_cells.append({
				'row': 2,
				'col': 2,
			})
			
		if (board[5][5] == Constants.EMPTY):
			possible_cells.append({
				'row': 5,
				'col': 5,
			})
		
		if (board[2][5] == Constants.EMPTY):
			possible_cells.append({
				'row': 2,
				'col': 5,
			})
		
		if (board[5][2] == Constants.EMPTY):
			possible_cells.append({
				'row': 5,
				'col': 2,
			})
				
	for move in moves:
		for dir in Constants.DIRECTIONS:
			var near_row = move['row'] + dir['dr']
			var near_col = move['col'] + dir['dc']
			
			
			if (!MainHelper.isInsideBoard(near_row, near_col)):
				continue
			
			if (board[near_row][near_col] == Constants.EMPTY):
				var ai_result = MainHelper.simulateMove(board, near_row, near_col, AI_PLAYER, false)
				var human_result = MainHelper.simulateMove(board, near_row, near_col, HUMAN_PLAYER, false)
				
				if (ai_result.isValid or human_result.isValid):
					possible_cells.append({
						'row': near_row,
						'col': near_col,
					})
				
	return possible_cells
		
static func getTopMoves(moves, board, AI_PLAYER, HUMAN_PLAYER, currentPlayer):
	var raw_cells = getPossibleCells(moves, board, AI_PLAYER, HUMAN_PLAYER)
	var possible_cells = []
	var used_cells = {}

	for cell in raw_cells:
		var row = cell["row"]
		var col = cell["col"]
		var key = str(row) + "-" + str(col)

		if used_cells.has(key):
			continue

		used_cells[key] = true

		var result = MainHelper.simulateMove(
			board,
			row,
			col,
			currentPlayer,
			false
		)

		if !result.isValid:
			continue

		cell["score"] = HeuristicHelper.evaluateBoard(
			board,
			row,
			col,
			currentPlayer
		)

		possible_cells.append(cell)

	possible_cells.sort_custom(func(a, b):
		return a["score"] > b["score"]
	)

	return possible_cells.slice(0, AIConstants.TOP_K)
		
static func get_best_move_for_ai(board, moves, AI_PLAYER, HUMAN_PLAYER) -> Dictionary:
	var immediate_win = getImmediateYugo(board, AI_PLAYER)

	if immediate_win["found"]:
		print("[IMMEDIATE WIN] AI choose row=", immediate_win["row"], " col=", immediate_win["col"])

		return {
			"row": immediate_win["row"],
			"col": immediate_win["col"],
			"score": immediate_win["score"],
		}
		
	var state = {
		"board": MainHelper.cloneBoard(board),
		"moves": moves.duplicate(true),
		"AI_PLAYER": AI_PLAYER,
		"HUMAN_PLAYER": HUMAN_PLAYER,
		"currentPlayer": AI_PLAYER,
	}

	print("===========================================================")
	var best_move = minimax(
		state,
		AIConstants.MAX_DEPTH,
		0,
		-INF,
		INF,
		true
	)
	print("===========================================================")

	return {
		"row": best_move["row"],
		"col": best_move["col"],
		"score": best_move["score"],
	}
	
static func maxMoves(last_move, new_move) -> Dictionary:
	if last_move.score >= new_move.score:
		return last_move
	return new_move

static func minMoves(last_move, new_move) -> Dictionary:
	if last_move.score <= new_move.score:
		return last_move
	return new_move
	
static func minimax(
	state: Dictionary,
	depth,
	curr_score,
	alpha,
	beta,
	is_maximizing
) -> Dictionary:

	var trace_depth = AIConstants.MAX_DEPTH - depth
	var role = "MAX / AI" if is_maximizing else "MIN / HUMAN"

	trace_log(
		trace_depth,
		"[ENTER] depth=" + str(depth) +
		" role=" + role +
		" curr_score=" + str(curr_score) +
		" alpha=" + str(alpha) +
		" beta=" + str(beta)
	)

	# Kondisi berhenti
	if depth == 0:
		trace_log(
			trace_depth,
			"[LEAF] return score=" + str(curr_score)
		)

		return {
			"row": -1,
			"col": -1,
			"score": curr_score,
		}

	var current_player
	var next_player

	if is_maximizing:
		current_player = state["AI_PLAYER"]
		next_player = state["HUMAN_PLAYER"]
	else:
		current_player = state["HUMAN_PLAYER"]
		next_player = state["AI_PLAYER"]

	var top_moves = getTopMoves(
		state["moves"],
		state["board"],
		state["AI_PLAYER"],
		state["HUMAN_PLAYER"],
		current_player
	)

	trace_log(
		trace_depth,
		"[MOVES] player=" + str(current_player) +
		" total_top_moves=" + str(len(top_moves))
	)

	# Jika tidak ada move yang bisa dipilih
	if len(top_moves) == 0:
		trace_log(
			trace_depth,
			"[NO MOVE] return score=" + str(curr_score)
		)

		return {
			"row": -1,
			"col": -1,
			"score": curr_score,
		}

	# Giliran AI / MAX
	if is_maximizing:
		var best_move = {
			"row": -1,
			"col": -1,
			"score": -INF,
		}

		for move in top_moves:
			trace_log(
				trace_depth,
				"[TRY MAX] move=(" + str(move["row"]) + "," + str(move["col"]) + ")" +
				" move_score=" + str(move["score"])
			)

			var result = MainHelper.simulateMove(
				state["board"],
				move["row"],
				move["col"],
				current_player,
				false
			)

			if !result.isValid:
				trace_log(
					trace_depth,
					"[SKIP MAX] invalid move=(" + str(move["row"]) + "," + str(move["col"]) + ")" +
					" message=" + str(result["message"])
				)
				continue

			var new_moves = state["moves"].duplicate(true)
			new_moves.append({
				"row": move["row"],
				"col": move["col"],
				"player": current_player,
			})

			# Karena AI bergerak, score ditambah
			var new_score = curr_score + move["score"]

			trace_log(
				trace_depth,
				"[SCORE MAX] old=" + str(curr_score) +
				" + move_score=" + str(move["score"]) +
				" => new_score=" + str(new_score)
			)

			var new_state = {
				"board": result["board"],
				"moves": new_moves,
				"AI_PLAYER": state["AI_PLAYER"],
				"HUMAN_PLAYER": state["HUMAN_PLAYER"],
				"currentPlayer": next_player,
			}

			var result_move = minimax(
				new_state,
				depth - 1,
				new_score,
				alpha,
				beta,
				false
			)

			var candidate_move = {
				"row": move["row"],
				"col": move["col"],
				"score": result_move["score"],
			}

			trace_log(
				trace_depth,
				"[RESULT MAX] move=(" + str(move["row"]) + "," + str(move["col"]) + ")" +
				" result_score=" + str(result_move["score"]) +
				" current_best=" + str(best_move["score"])
			)

			best_move = maxMoves(best_move, candidate_move)

			trace_log(
				trace_depth,
				"[BEST MAX] best_move=(" + str(best_move["row"]) + "," + str(best_move["col"]) + ")" +
				" best_score=" + str(best_move["score"])
			)

			alpha = max(alpha, best_move["score"])

			trace_log(
				trace_depth,
				"[ALPHA UPDATE] alpha=" + str(alpha) +
				" beta=" + str(beta)
			)

			if beta <= alpha:
				trace_log(
					trace_depth,
					"[PRUNE MAX] beta <= alpha | beta=" + str(beta) +
					" alpha=" + str(alpha)
				)
				break

		trace_log(
			trace_depth,
			"[RETURN MAX] move=(" + str(best_move["row"]) + "," + str(best_move["col"]) + ")" +
			" score=" + str(best_move["score"])
		)

		return best_move

	# Giliran Human / MIN
	else:
		var best_move = {
			"row": -1,
			"col": -1,
			"score": INF,
		}

		for move in top_moves:
			trace_log(
				trace_depth,
				"[TRY MIN] move=(" + str(move["row"]) + "," + str(move["col"]) + ")" +
				" move_score=" + str(move["score"])
			)

			var result = MainHelper.simulateMove(
				state["board"],
				move["row"],
				move["col"],
				current_player,
				false
			)

			if !result.isValid:
				trace_log(
					trace_depth,
					"[SKIP MIN] invalid move=(" + str(move["row"]) + "," + str(move["col"]) + ")" +
					" message=" + str(result["message"])
				)
				continue

			var new_moves = state["moves"].duplicate(true)
			new_moves.append({
				"row": move["row"],
				"col": move["col"],
				"player": current_player,
			})

			# Karena Human bergerak, score AI dikurangi
			var new_score = curr_score - move["score"]

			trace_log(
				trace_depth,
				"[SCORE MIN] old=" + str(curr_score) +
				" - move_score=" + str(move["score"]) +
				" => new_score=" + str(new_score)
			)

			var new_state = {
				"board": result["board"],
				"moves": new_moves,
				"AI_PLAYER": state["AI_PLAYER"],
				"HUMAN_PLAYER": state["HUMAN_PLAYER"],
				"currentPlayer": next_player,
			}

			var result_move = minimax(
				new_state,
				depth - 1,
				new_score,
				alpha,
				beta,
				true
			)

			var candidate_move = {
				"row": move["row"],
				"col": move["col"],
				"score": result_move["score"],
			}

			trace_log(
				trace_depth,
				"[RESULT MIN] move=(" + str(move["row"]) + "," + str(move["col"]) + ")" +
				" result_score=" + str(result_move["score"]) +
				" current_best=" + str(best_move["score"])
			)

			best_move = minMoves(best_move, candidate_move)

			trace_log(
				trace_depth,
				"[BEST MIN] best_move=(" + str(best_move["row"]) + "," + str(best_move["col"]) + ")" +
				" best_score=" + str(best_move["score"])
			)

			beta = min(beta, best_move["score"])

			trace_log(
				trace_depth,
				"[BETA UPDATE] alpha=" + str(alpha) +
				" beta=" + str(beta)
			)

			if beta <= alpha:
				trace_log(
					trace_depth,
					"[PRUNE MIN] beta <= alpha | beta=" + str(beta) +
					" alpha=" + str(alpha)
				)
				break

		trace_log(
			trace_depth,
			"[RETURN MIN] move=(" + str(best_move["row"]) + "," + str(best_move["col"]) + ")" +
			" score=" + str(best_move["score"])
		)

		return best_move
			
# tracing helper
static func trace_indent(depth) -> String:
	var text = ""
	for i in range(depth):
		text += "  "
	return text
	
static func trace_log(depth, message: String) -> void:
	if !AIConstants.DEBUG_MINIMAX:
		return

	print(trace_indent(depth) + message)
		
