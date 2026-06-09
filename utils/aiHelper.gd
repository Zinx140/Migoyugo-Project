extends Node
class_name AiHelper

var winner: String = ""
const DEBUG_MINIMAX := true
const DEBUG_MAX_PRINT_DEPTH := 10

static var debug_node_count := 0

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
	
	moves.sort_custom(func(a, b):
		return a["score"] > b["score"]
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
		
	var ai_move = minimax_alphabeta(
		true,
		-INF,
		INF,
		board,
		AI_PLAYER,
		HUMAN_PLAYER,
		0
	)
	
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
	
static func minimax_alphabeta(is_maximizing, alpha: float, beta: float, board, AI_PLAYER, HUMAN_PLAYER, depth):
	if depth >= Constants.MAX_DEPTH or MainHelper.isBoardFull(board):
		return {
			"row": -1,
			"col": -1,
			"board": board,
			"score": HeuristicHelper.evaluateBoardState(board, AI_PLAYER, HUMAN_PLAYER),
			"winner": "",
		}
	
	if is_maximizing:
		var top_moves = getTopMoves(board, AI_PLAYER, HUMAN_PLAYER, false)
		
		if top_moves.size() == 0:
			return {
				"row": -1,
				"col": -1,
				"board": board,
				"score": HeuristicHelper.evaluateBoardState(board, AI_PLAYER, HUMAN_PLAYER),
				"winner": "",
			}
		
		var best_val = {
			"row": -1,
			"col": -1,
			"board": board,
			"score": -INF,
			"winner": "",
		}
		
		for move in top_moves:
			var value
			
			if move.has("winner") and move["winner"] == AI_PLAYER:
				value = {
					"score": AIConstants.WIN_NOW_SCORE,
				}
			elif move.has("winner") and move["winner"] == HUMAN_PLAYER:
				value = {
					"score": AIConstants.LOSE_NEXT_TURN_SCORE,
				}
			else:
				value = minimax_alphabeta(
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
				"winner": move.get("winner", ""),
			}
			
			best_val = maxMoves(best_val, candidate)
			alpha = max(alpha, best_val["score"])
			
			print('==================================')
			print('Move: ', best_val['row'], ' - ', best_val['col'])
			if beta <= alpha:
				print("max prunned: ", best_val["score"])
				break
			else: 
				print("max: ", best_val["score"])
				
			print('==================================')
		
		return best_val
	
	else:
		var top_moves = getTopMoves(board, AI_PLAYER, HUMAN_PLAYER, true)
		
		if top_moves.size() == 0:
			return {
				"row": -1,
				"col": -1,
				"board": board,
				"score": HeuristicHelper.evaluateBoardState(board, AI_PLAYER, HUMAN_PLAYER),
				"winner": "",
			}
		
		var best_val = {
			"row": -1,
			"col": -1,
			"board": board,
			"score": INF,
			"winner": "",
		}
		
		for move in top_moves:
			var value
			
			if move.has("winner") and move["winner"] == AI_PLAYER:
				value = {
					"score": AIConstants.WIN_NOW_SCORE,
				}
			elif move.has("winner") and move["winner"] == HUMAN_PLAYER:
				value = {
					"score": AIConstants.LOSE_NEXT_TURN_SCORE,
				}
			else:
				value = minimax_alphabeta(
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
				"winner": move.get("winner", ""),
			}
			
			best_val = minMoves(best_val, candidate)
			beta = min(beta, best_val["score"])
			
			print('==================================')
			print('Move: ', best_val['row'], ' - ', best_val['col'])
			if beta <= alpha:
				print("min prunned: ", best_val["score"])
				break
			else:
				print("min: ", best_val["score"])
			print('==================================')
		
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
