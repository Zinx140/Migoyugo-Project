extends Node
class_name AiHelper

var winner: String = ""

static func getTopMoves(board, AI_PLAYER, HUMAN_PLAYER, is_player_turn):
	var moves = []
	var curr_turn = AI_PLAYER
	
	if is_player_turn:
		curr_turn = HUMAN_PLAYER
		
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue
					
			if not MainHelper.canPlaceMigo(board, row, col, curr_turn):
				continue
			
			moves.append(HeuristicHelper.evaluateBoard(row, col, board, curr_turn))
	
	if curr_turn == AI_PLAYER:
		moves.sort_custom(func(a, b):
			return a["score"] > b["score"]
		)
	else:
		moves.sort_custom(func(a, b):
			return a["score"] < b["score"]
		)
	
	return moves.slice(0, Constants.TOP_K)
	
static func cloneBoard(source_board):
	var new_board = []
	for row in source_board:
		new_board.append(row.duplicate())
	return new_board
	
static func get_best_move_for_ai(board, AI_PLAYER, HUMAN_PLAYER) -> Dictionary:
	var immediate_ai_win = findImmediateIgoMove(board, AI_PLAYER)

	if immediate_ai_win.found:
		print("AI immediate Igo at: ", immediate_ai_win.row, ", ", immediate_ai_win.col)
		return {
			"row": immediate_ai_win.row,
			"col": immediate_ai_win.col,
		}

	var immediate_block = findBlockImmediateIgoMove(board, AI_PLAYER, HUMAN_PLAYER)

	if immediate_block.found:
		print("AI block immediate Igo at: ", immediate_block.row, ", ", immediate_block.col)
		return {
			"row": immediate_block.row,
			"col": immediate_block.col,
		}
		
	var ai_move = minimax_alphabeta(true, 
		{
			"row": 0,
			"col": 0,
			"board": cloneBoard(board),
			"score": -INF,
		}, 
		{
			"row": 0,
			"col": 0,
			"board": cloneBoard(board),
			"score": INF,
		}, 
		cloneBoard(board), AI_PLAYER, HUMAN_PLAYER, 1)
	
	var test_result = MainHelper.simulateMove(
		board,
		ai_move["row"],
		ai_move["col"],
		AI_PLAYER,
		false
	)
	
	if test_result["isValid"]:
		return {
			"row": ai_move["row"],
			"col": ai_move["col"],
		}
	
	print("Minimax returned invalid move: ", ai_move)
	
	var fallback = findFallbackValidMove(board, AI_PLAYER)
	
	if fallback["found"]:
		return {
			"row": fallback["row"],
			"col": fallback["col"],
		}
	
	return {
		"row": -1,
		"col": -1,
	}
	
static func maxMoves(last_move, new_move) -> Dictionary:
	if last_move["score"] >= new_move["score"]:
		return last_move
	return new_move

static func minMoves(last_move, new_move) -> Dictionary:
	if last_move["score"] <= new_move["score"]:
		return last_move
	return new_move
	
static func minimax_alphabeta(is_maximizing, alpha, beta, board, AI_PLAYER, HUMAN_PLAYER, depth):
	if depth >= Constants.MAX_DEPTH:
		var top_moves = getTopMoves(board, AI_PLAYER, HUMAN_PLAYER, !is_maximizing)
		
		if top_moves.size() == 0:
			return {
				"row": -1,
				"col": -1,
				"board": board,
				"score": 0,
			}
		
		var best_val = top_moves[0]
		
		for move in top_moves:
			if is_maximizing:
				best_val = maxMoves(best_val, move)
			else:
				best_val = minMoves(best_val, move)
		
		return best_val
	
	if is_maximizing:
		var top_moves = getTopMoves(board, AI_PLAYER, HUMAN_PLAYER, false)
		
		var best_val = {
			"row": -1,
			"col": -1,
			"board": board,
			"score": -INF,
		}
		
		for move in top_moves:
			var value = minimax_alphabeta(
				false,
				alpha,
				beta,
				move["board"],
				AI_PLAYER,
				HUMAN_PLAYER,
				depth + 1
			)
			
			var candidate = {
				"row": move["row"],
				"col": move["col"],
				"board": move["board"],
				"score": value["score"],
			}
			
			best_val = maxMoves(best_val, candidate)
			alpha = maxMoves(alpha, best_val)
			
			if beta["score"] <= alpha["score"]:
				break
		
		return best_val
	
	else:
		var top_moves = getTopMoves(board, AI_PLAYER, HUMAN_PLAYER, true)
		
		var best_val = {
			"row": -1,
			"col": -1,
			"board": board,
			"score": INF,
		}
		
		for move in top_moves:
			var value = minimax_alphabeta(
				true,
				alpha,
				beta,
				move["board"],
				AI_PLAYER,
				HUMAN_PLAYER,
				depth + 1
			)
			
			var candidate = {
				"row": move["row"],
				"col": move["col"],
				"board": move["board"],
				"score": value["score"],
			}
			
			best_val = minMoves(best_val, candidate)
			beta = minMoves(beta, best_val)
			
			if beta["score"] <= alpha["score"]:
				break
		
		return best_val
		
static func findImmediateIgoMove(board, player) -> Dictionary:
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue

			var result = MainHelper.simulateMove(board, row, col, player, false)

			if result.isValid and result.winner == player:
				return {
					"found": true,
					"row": row,
					"col": col,
					"board": result.board,
					"score": AIConstants.WIN_NOW_SCORE,
				}

	return {
		"found": false,
	}

static func findBlockImmediateIgoMove(board, AI_PLAYER, HUMAN_PLAYER) -> Dictionary:
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue

			var human_result = MainHelper.simulateMove(board, row, col, HUMAN_PLAYER, false)

			if not human_result.isValid:
				continue

			if human_result.winner != HUMAN_PLAYER:
				continue

			var ai_block_result = MainHelper.simulateMove(board, row, col, AI_PLAYER, false)

			if ai_block_result.isValid:
				return {
					"found": true,
					"row": row,
					"col": col,
					"board": ai_block_result.board,
					"score": 950_000_000,
				}

	return {
		"found": false,
	}

static func findFallbackValidMove(board, AI_PLAYER) -> Dictionary:
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue
			
			var result = MainHelper.simulateMove(board, row, col, AI_PLAYER, false)
			
			if result["isValid"]:
				return {
					"found": true,
					"row": row,
					"col": col,
				}
	
	return {
		"found": false,
	}
	
static func findOpenSpecialThreeMove(board, player) -> Dictionary:
	var best_move = {
		"found": false,
		"row": -1,
		"col": -1,
		"score": -INF,
	}

	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue

			var result = MainHelper.simulateMove(board, row, col, player, false)

			if not result["isValid"]:
				continue

			if not MainHelper.isSpecialToken(result["board"][row][col], player):
				continue

			var open_three_score = getOpenSpecialThreeScore(result["board"], row, col, player)

			if open_three_score <= 0:
				continue

			var score = AIConstants.OPEN_SPECIAL_THREE_ATTACK
			score += open_three_score
			score += HeuristicHelper.getDistanceFromCenter(row, col) * -100

			if score > best_move["score"]:
				best_move = {
					"found": true,
					"row": row,
					"col": col,
					"score": score,
				}

	return best_move

static func getOpenSpecialThreeScore(board, row, col, player) -> int:
	var score := 0

	for axis in Constants.AXES:
		var backward_count = countSpecialInDirection(
			board,
			row,
			col,
			-axis.dr,
			-axis.dc,
			player
		)

		var forward_count = countSpecialInDirection(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			player
		)

		var total_special = 1 + backward_count + forward_count

		if total_special != 3:
			continue

		var open_ends = countOpenEndsForSpecialLine(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			player
		)

		if open_ends == 2:
			score += 3
		elif open_ends == 1:
			score += 1

	return score

static func countSpecialInDirection(board, row, col, dr, dc, player) -> int:
	var count := 0
	var current_row = row + dr
	var current_col = col + dc

	while MainHelper.isInsideBoard(current_row, current_col) and MainHelper.isSpecialToken(board[current_row][current_col], player):
		count += 1
		current_row += dr
		current_col += dc

	return count

static func countOpenEndsForSpecialLine(board, row, col, dr, dc, player) -> int:
	var open_ends := 0

	var current_row = row - dr
	var current_col = col - dc

	while MainHelper.isInsideBoard(current_row, current_col) and MainHelper.isSpecialToken(board[current_row][current_col], player):
		current_row -= dr
		current_col -= dc

	if MainHelper.isInsideBoard(current_row, current_col) and board[current_row][current_col] == Constants.EMPTY:
		open_ends += 1

	current_row = row + dr
	current_col = col + dc

	while MainHelper.isInsideBoard(current_row, current_col) and MainHelper.isSpecialToken(board[current_row][current_col], player):
		current_row += dr
		current_col += dc

	if MainHelper.isInsideBoard(current_row, current_col) and board[current_row][current_col] == Constants.EMPTY:
		open_ends += 1

	return open_ends

static func findBlockOpponentSpecialThreeSetupMove(board, AI_PLAYER, HUMAN_PLAYER) -> Dictionary:
	var best_move = {
		"found": false,
		"row": -1,
		"col": -1,
		"score": -INF,
	}

	for axis in Constants.AXES:
		for row in range(Constants.BOARD_SIZE):
			for col in range(Constants.BOARD_SIZE):
				var cells = getLineWindowCells(row, col, axis.dr, axis.dc, 5)

				if cells.size() == 0:
					continue

				var tokens = []

				for cell in cells:
					tokens.append(board[cell["row"]][cell["col"]])

				var block_cell = null

				var pattern_right = (
					tokens[0] == Constants.EMPTY
					and MainHelper.isBasicToken(tokens[1], HUMAN_PLAYER)
					and MainHelper.isSpecialToken(tokens[2], HUMAN_PLAYER)
					and MainHelper.isSpecialToken(tokens[3], HUMAN_PLAYER)
					and tokens[4] == Constants.EMPTY
				)

				if pattern_right:
					block_cell = cells[4]

				var pattern_left = (
					tokens[0] == Constants.EMPTY
					and MainHelper.isSpecialToken(tokens[1], HUMAN_PLAYER)
					and MainHelper.isSpecialToken(tokens[2], HUMAN_PLAYER)
					and MainHelper.isBasicToken(tokens[3], HUMAN_PLAYER)
					and tokens[4] == Constants.EMPTY
				)

				if pattern_left:
					block_cell = cells[0]

				if block_cell == null:
					continue

				var block_result = MainHelper.simulateMove(
					board,
					block_cell["row"],
					block_cell["col"],
					AI_PLAYER,
					false
				)

				if not block_result["isValid"]:
					continue

				var score = AIConstants.BLOCK_OPEN_SPECIAL_THREE_SETUP
				score += HeuristicHelper.getDistanceFromCenter(block_cell["row"], block_cell["col"]) * -100

				if score > best_move["score"]:
					best_move = {
						"found": true,
						"row": block_cell["row"],
						"col": block_cell["col"],
						"score": score,
					}

	return best_move

static func getLineWindowCells(start_row, start_col, dr, dc, length) -> Array:
	var cells = []

	for i in range(length):
		var row = start_row + dr * i
		var col = start_col + dc * i

		if not MainHelper.isInsideBoard(row, col):
			return []

		cells.append({
			"row": row,
			"col": col,
		})

	return cells
