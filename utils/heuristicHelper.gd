extends Node
class_name HeuristicHelper

static func evaluateBoard(board, row, col, currentPlayer) -> int:
	var result = MainHelper.simulateMove(board, row, col, currentPlayer, false)
	if !result.isValid:
		return 0
	
	var score = AIConstants.SCORE_TILES[row][col]
	if result.winner == currentPlayer:
		return score + AIConstants.WIN_SCORE

	score -= isOpenOpponentIgo(row, col, board, currentPlayer) * AIConstants.OPEN_OPPONENT_IGO
	score += isBlockOpponentIgo(row, col, board, currentPlayer) * AIConstants.BLOCK_IGO

	score += totalBlockSpecialThreeYugo(
		row,
		col,
		board,
		currentPlayer
	) * AIConstants.BLOCK_SPECIAL_THREE_YUGO

	score += totalBlockedOpponentYugo(row, col, board, currentPlayer) * AIConstants.BLOCK_YUGO
	score += isYugo(row, col, result.board, currentPlayer) * AIConstants.DIRECT_YUGO
	score += totalDirectSpecialThreeYugo(
		row,
		col,
		result.board,
		currentPlayer
	) * AIConstants.DIRECT_SPECIAL_THREE_YUGO
	return score

# mengembalikan total yugo yang berhasil di blokir
static func totalBlockedOpponentYugo(row, col, board, currentPlayer) -> int:
	if !MainHelper.isInsideBoard(row, col):
		return 0

	if board[row][col] != Constants.EMPTY:
		return 0

	var opponent = MainHelper.getOpponent(currentPlayer)
	var total_blocked = 0

	for axis in Constants.AXES:
		var connected_cells = MainHelper.collectConnectedCells(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			opponent
		)

		if connected_cells.size() == 3:
			total_blocked += 1

	return total_blocked
	
static func isYugo(row, col, board, currentPlayer) -> int:
	return 1 if board[row][col] != currentPlayer else 0

static func isBlockOpponentIgo(row, col, board, currentPlayer) -> int:
	if !MainHelper.isInsideBoard(row, col):
		return 0

	if board[row][col] != Constants.EMPTY:
		return 0

	var opponent = MainHelper.getOpponent(currentPlayer)

	var opponent_result = MainHelper.simulateMove(
		board,
		row,
		col,
		opponent,
		false
	)

	if opponent_result.isValid and opponent_result.winner == opponent:
		return 1

	return 0

static func isIgo(result) -> int:
	return 0 if result.winner == "" else 1

static func isOpenOpponentIgo(row, col, board, currentPlayer) -> int:
	var result = MainHelper.simulateMove(board, row, col, currentPlayer, false)
	if (!result.isValid):
		return 0
	
	var opponent = MainHelper.getOpponent(currentPlayer)
	for i in range(0, 8):
		for j in range(0, 8):
			if (result.board[i][j] != Constants.EMPTY):
				continue
			
			var opponent_result = MainHelper.simulateMove(result.board, i, j, opponent, false)
			if (opponent_result.winner != ""):
				return 1
			
	return 0

static func totalBlockSpecialThreeYugo(row, col, board, currentPlayer) -> int:
	if !MainHelper.isInsideBoard(row, col):
		return 0

	# Block hanya dihitung kalau cell ini masih kosong sebelum kita menaruh
	if board[row][col] != Constants.EMPTY:
		return 0

	var opponent = MainHelper.getOpponent(currentPlayer)
	var total = 0

	for axis in Constants.AXES:
		# Cek arah normal:
		# [row,col] XB XB B _
		if isBlockingSpecialThreeThreat(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			opponent
		):
			total += 1

		# Cek arah sebaliknya:
		# _ B XB XB [row,col]
		if isBlockingSpecialThreeThreat(
			board,
			row,
			col,
			-axis.dr,
			-axis.dc,
			opponent
		):
			total += 1

	return total

static func isBlockingSpecialThreeThreat(board, row, col, dr, dc, opponent) -> bool:
	var r1 = row + dr
	var c1 = col + dc

	var r2 = row + 2 * dr
	var c2 = col + 2 * dc

	var r3 = row + 3 * dr
	var c3 = col + 3 * dc

	var r4 = row + 4 * dr
	var c4 = col + 4 * dc

	if !MainHelper.isInsideBoard(r1, c1):
		return false

	if !MainHelper.isInsideBoard(r2, c2):
		return false

	if !MainHelper.isInsideBoard(r3, c3):
		return false

	if !MainHelper.isInsideBoard(r4, c4):
		return false

	if !MainHelper.isSpecialToken(board[r1][c1], opponent):
		return false

	if !MainHelper.isSpecialToken(board[r2][c2], opponent):
		return false

	if !MainHelper.isBasicToken(board[r3][c3], opponent):
		return false

	if board[r4][c4] != Constants.EMPTY:
		return false

	return true
	
static func totalDirectSpecialThreeYugo(row, col, board, currentPlayer) -> int:
	if !MainHelper.isInsideBoard(row, col):
		return 0

	var total = 0

	for axis in Constants.AXES:
		if hasDirectXThreeIncludingCell(
			board,
			row,
			col,
			axis.dr,
			axis.dc,
			currentPlayer
		):
			total += 1

	return total
	
static func hasDirectXThreeIncludingCell(board, row, col, dr, dc, currentPlayer) -> bool:
	for offset in range(-2, 1):
		var start_row = row + offset * dr
		var start_col = col + offset * dc

		var valid = true

		for i in range(3):
			var check_row = start_row + i * dr
			var check_col = start_col + i * dc

			if !MainHelper.isInsideBoard(check_row, check_col):
				valid = false
				break

			if !MainHelper.isSpecialToken(board[check_row][check_col], currentPlayer):
				valid = false
				break

		if valid:
			return true

	return false
