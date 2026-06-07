extends Node
class_name HeuristicHelper

const DIRECTIONS := [
	[-1, -1], [-1, 0], [-1, 1],
	[0, -1],           [0, 1],
	[1, -1],  [1, 0],  [1, 1],
]

const CENTER_TILES := [
	[3, 3], [3, 4],
	[4, 3], [4, 4],
]

static func evaluateBoard(row, col, board, curr_turn) -> Dictionary:
	var move_result = MainHelper.simulateMove(board, row, col, curr_turn, false)
	var score = AIConstants.SCORE_TILES[row][col]
	
	if isInvalidMove(move_result):
		score += getInvalidMoveScore()
		
		return {
			"row": row,
			"col": col,
			"board": board,
			"score": score,
		}
	
	var new_board = move_result["board"]
	
	score += getYugoAttackScore(row, col, board, curr_turn)
	score += getMigoNearbyScore(row, col, board, curr_turn)
	score += getBlockOpponentYugoScore(row, col, board, curr_turn)
	score += getUnsafeYugoPenalty(row, col, board, new_board, move_result, curr_turn)
	score += getOwnSpecialThreeScore(row, col, new_board, curr_turn)
	score += getBlockOpponentSpecialThreeScore(row, col, board, new_board, curr_turn)
	score += getOpponentSpecialThreePenalty(new_board, curr_turn)

	return {
		"row": row,
		"col": col,
		"board": new_board,
		"score": score,
	}

static func isInvalidMove(move_result: Dictionary) -> bool:
	return not move_result["isValid"]

static func getInvalidMoveScore() -> int:
	return AIConstants.OWN_INVALID_MOVE

static func getYugoAttackScore(row, col, board, curr_turn) -> int:
	var score := 0
	var distance = getDistanceFromCenter(row, col)
	
	for axis in Constants.AXES:
		var line_length = MainHelper.countLineLength(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			curr_turn
		)
		
		if line_length == 4:
			score += AIConstants.DIRECT_YUGO
			score += getDirectYugoCenterBonus(distance)
		
		elif line_length == 3:
			score += AIConstants.MIGO_LINE_THREE
			score += AIConstants.FUTURE_YUGO
			score += getFutureYugoCenterBonus(distance)
		
		elif line_length == 2:
			score += AIConstants.MIGO_LINE_TWO
			score += getEarlyYugoCenterBonus(distance)
	
	return score

static func getMigoNearbyScore(row, col, board, curr_turn) -> int:
	var score := 0
	
	for dir in DIRECTIONS:
		var new_row = row + dir[0]
		var new_col = col + dir[1]
		
		if not MainHelper.isInsideBoard(new_row, new_col):
			continue
		
		var token = board[new_row][new_col]
		
		if MainHelper.isBasicToken(token, curr_turn):
			if abs(dir[0]) == 1 and abs(dir[1]) == 1:
				score += AIConstants.MIGO_NEAR_DIAGONAL
			else:
				score += AIConstants.MIGO_NEAR_ORTHOGONAL
	
	return score

static func getDirectYugoCenterBonus(distance: int) -> int:
	if distance == 0:
		return AIConstants.YUGO_CENTER_DIRECT
	
	if distance == 1:
		return AIConstants.YUGO_CENTER_NEAR
	
	if distance == 2:
		return AIConstants.YUGO_CENTER_MID
	
	return 0

static func getFutureYugoCenterBonus(distance: int) -> int:
	if distance == 0:
		return AIConstants.FUTURE_YUGO_CENTER
	
	if distance == 1:
		return AIConstants.FUTURE_YUGO_NEAR_CENTER
	
	if distance == 2:
		return AIConstants.FUTURE_YUGO_MID_CENTER
	
	return 0

static func getEarlyYugoCenterBonus(distance: int) -> int:
	if distance == 0:
		return int(AIConstants.FUTURE_YUGO_CENTER * 0.5)
	
	if distance == 1:
		return int(AIConstants.FUTURE_YUGO_NEAR_CENTER * 0.5)
	
	if distance == 2:
		return int(AIConstants.FUTURE_YUGO_MID_CENTER * 0.5)
	
	return 0

static func getDistanceFromCenter(row, col) -> int:
	var min_distance := 999
	
	for tile in CENTER_TILES:
		var distance = abs(row - tile[0]) + abs(col - tile[1])
		min_distance = min(min_distance, distance)
	
	return min_distance

static func getBlockOpponentYugoScore(row, col, board, curr_turn) -> int:
	var opponent = MainHelper.getOpponent(curr_turn)
	
	var opponent_result = MainHelper.simulateMove(board, row, col, opponent, false)
	
	if not opponent_result["isValid"]:
		return 0
	
	if opponent_result["winner"] == opponent:
		return -AIConstants.LOSE_NEXT_TURN_SCORE
	
	var opponent_board = opponent_result["board"]
	var opponent_token = opponent_board[row][col]
	
	if MainHelper.isSpecialToken(opponent_token, opponent):
		var distance = getDistanceFromCenter(row, col)
		var score = AIConstants.BLOCK_DIRECT_YUGO
		
		if distance == 0:
			score += AIConstants.YUGO_CENTER_DIRECT
		elif distance == 1:
			score += AIConstants.YUGO_CENTER_NEAR
		elif distance == 2:
			score += AIConstants.YUGO_CENTER_MID
		
		return score
	
	return 0

static func getUnsafeYugoPenalty(row, col, old_board, new_board, move_result, curr_turn) -> int:
	if move_result["winner"] == curr_turn:
		return 0
	
	var token_after_move = new_board[row][col]
	
	if not MainHelper.isSpecialToken(token_after_move, curr_turn):
		return 0
	
	if opponentHasImmediateIgo(new_board, curr_turn):
		return AIConstants.UNSAFE_YUGO_OPEN_IGO
	
	return 0
	
static func opponentHasImmediateIgo(board, curr_turn) -> bool:
	var opponent = MainHelper.getOpponent(curr_turn)
	
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] != Constants.EMPTY:
				continue
			
			var result = MainHelper.simulateMove(board, row, col, opponent, false)
			
			if result["isValid"] and result["winner"] == opponent:
				return true
	
	return false

static func getOwnSpecialThreeScore(row, col, board, curr_turn) -> int:
	var token = board[row][col]

	if not MainHelper.isSpecialToken(token, curr_turn):
		return 0

	var score := 0

	for axis in Constants.AXES:
		var backward_count = countSpecialInDirection(
			board,
			row,
			col,
			-axis.dr,
			-axis.dc,
			curr_turn
		)

		var forward_count = countSpecialInDirection(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			curr_turn
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
			curr_turn
		)

		if open_ends == 2:
			score += AIConstants.SELF_OPEN_SPECIAL_THREE
		elif open_ends == 1:
			score += AIConstants.SELF_CLOSED_SPECIAL_THREE

	return score

static func getBlockOpponentSpecialThreeScore(row, col, old_board, new_board, curr_turn) -> int:
	var opponent = MainHelper.getOpponent(curr_turn)

	var before_score = countOpenSpecialThreeThreatScore(old_board, opponent)
	var after_score = countOpenSpecialThreeThreatScore(new_board, opponent)

	var blocked_score = before_score - after_score

	if blocked_score <= 0:
		return 0

	return blocked_score * AIConstants.BLOCK_OPPONENT_OPEN_SPECIAL_THREE

static func getOpponentSpecialThreePenalty(new_board, curr_turn) -> int:
	var opponent = MainHelper.getOpponent(curr_turn)

	var threat_score = countOpenSpecialThreeThreatScore(new_board, opponent)

	if threat_score <= 0:
		return 0

	return threat_score * AIConstants.OPPONENT_OPEN_SPECIAL_THREE_THREAT

static func countOpenSpecialThreeThreatScore(board, player) -> int:
	var total_score := 0

	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if board[row][col] == Constants.EMPTY:
				continue

			if not MainHelper.isSpecialToken(board[row][col], player):
				continue

			total_score += getSpecialThreeLineScore(board, row, col, player)

	return total_score

static func getSpecialThreeLineScore(board, row, col, player) -> int:
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
