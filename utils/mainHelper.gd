extends Node
class_name MainHelper

static var winner = ""
static var TEXT_INFO = null

static func get_cell_id(row, col):
	return "%d_%d" % [row, col]

static func getWegoTokenScore(token: String) -> int:
	if token.begins_with("S"):
		return 3
	if token.begins_with("T"):
		return 2
	if token.begins_with("X"):
		return 1

	return 0

static func clone_board(source_board):
	var new_board = []
	for row in source_board:
		new_board.append(row.duplicate())
	return new_board

static func getOpponent(player):
	return Constants.BLACK if player == Constants.WHITE else Constants.WHITE

static func create_empty_board():
	var board = []
	for row in range(Constants.BOARD_SIZE):
		var row_array = []
		for col in range(Constants.BOARD_SIZE):
			row_array.append(Constants.EMPTY)
		board.append(row_array)
	return board

static func isBasicToken(token, player) -> bool:
	return token == player

static func getTokenOwner(token):
	if not token:
		return null
		
	if token.ends_with(Constants.WHITE):
		return Constants.WHITE
	if token.ends_with(Constants.BLACK):
		return Constants.BLACK

	return null

static func isInsideBoard(row, col):
	return row >= 0 and row < Constants.BOARD_SIZE and col >= 0 and col < Constants.BOARD_SIZE

static func isPlayerToken(token, player) -> bool:
	return getTokenOwner(token) == player

static func cloneBoard(sourceBoard):
	var cloned = []
	for row in sourceBoard:
		cloned.append(row.duplicate())
	return cloned

static func collectOneDirection(sourceBoard, row, col, dr: int, dc: int, player, cells: Array):
	var currentRow = row + dr
	var currentCol = col + dc

	while isInsideBoard(currentRow, currentCol) and isPlayerToken(sourceBoard[currentRow][currentCol], player):
		cells.append({ "row": currentRow, "col": currentCol })
		currentRow += dr
		currentCol += dc

static func collectConnectedCells(sourceBoard, row, col, dr, dc, player):
	var cells = []
	collectOneDirection(sourceBoard, row, col, dr, dc, player, cells)
	collectOneDirection(sourceBoard, row, col, -dr, -dc, player, cells)
	return cells

static func countLineLength(sourceBoard, row, col, dr, dc, player):
	var connectedCells = collectConnectedCells(sourceBoard, row, col, dr, dc, player)
	return 1 + connectedCells.size()

static func canPlaceMigo(sourceBoard, row, col, player):
	for axis in Constants.AXES:
		var total = countLineLength(sourceBoard, row, col, axis.dr, axis.dc, player)
		if total > 4:
			return false
	return true

static func resolveYugo(sourceBoard, row, col, player) -> int:
	var matchedAxes = []
	var cellsToClear = {}

	for axis in Constants.AXES:
		var connectedCells = collectConnectedCells(sourceBoard, row, col, axis.dr, axis.dc, player)

		if connectedCells.size() == 3:
			matchedAxes.append(axis.name)
			for cell in connectedCells:
				var token = sourceBoard[cell.row][cell.col]
				if isBasicToken(token, player):
					var key = str(cell.row) + "-" + str(cell.col)
					cellsToClear[key] = cell

	if matchedAxes.size() == 0:
		return 0

	for cell in cellsToClear.values():
		sourceBoard[cell.row][cell.col] = Constants.EMPTY

	if matchedAxes.size() > 3:
		sourceBoard[row][col] = "S" + str(player)
	elif matchedAxes.size() > 1:
		sourceBoard[row][col] = "T" + str(player)
	else:
		sourceBoard[row][col] = "X" + str(player)

	return matchedAxes.size()

static func isSpecialToken(token, player) -> bool:
	return token == "X" + str(player) or token == "T" + str(player) or token == "S" + str(player)

static func countSpecialTokenInDirection(sourceBoard, row, col, dr: int, dc: int, player) -> int:
	var count = 0
	var currentRow = row + dr
	var currentCol = col + dc

	while isInsideBoard(currentRow, currentCol) and isSpecialToken(sourceBoard[currentRow][currentCol], player):
		count += 1
		currentRow += dr
		currentCol += dc

	return count

static func isIgo(sourceBoard, row, col, player) -> bool:
	var selectedToken = sourceBoard[row][col]
	if not isSpecialToken(selectedToken, player):
		return false

	var count = 1
	for direction in Constants.DIRECTIONS:
		count += countSpecialTokenInDirection(sourceBoard, row, col, direction.dr, direction.dc, player)

	return count == 4

static func simulateMove(sourceBoard, row, col, player) -> Dictionary:
	if not isInsideBoard(row, col):
		return {
			"isValid": false,
			"message": "Invalid position.",
			"board": sourceBoard,
			"winner": ""
		}

	if sourceBoard[row][col] != Constants.EMPTY:
		return {
			"isValid": false,
			"message": "Cell already filled.",
			"board": sourceBoard,
			"winner": ""
		}

	var newBoard = cloneBoard(sourceBoard)
	newBoard[row][col] = player

	if not canPlaceMigo(newBoard, row, col, player):
		return {
			"isValid": false,
			"message": "Can't be placed here.",
			"board": sourceBoard,
			"winner": ""
		}

	resolveYugo(newBoard, row, col, player)
	var hasIgo = isIgo(newBoard, row, col, player)

	return {
		"isValid": true,
		"message": "Success",
		"board": newBoard,
		"winner": player if hasIgo else ""
	}

static func updateInfo(currentPlayer, message: String = "") -> void:
	if not TEXT_INFO:
		return

	if message != "":
		TEXT_INFO.text = message
		return

	TEXT_INFO.text = "Turn: " + str(currentPlayer)

static func isBoardFull(sourceBoard) -> bool:
	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			if sourceBoard[row][col] == Constants.EMPTY:
				return false
	return true

static func getWegoResult(sourceBoard) -> Dictionary:
	var white = Constants.WHITE
	var black = Constants.BLACK
	
	var scores = {
		white: 0,
		black: 0
	}

	for row in range(Constants.BOARD_SIZE):
		for col in range(Constants.BOARD_SIZE):
			var token = sourceBoard[row][col]
			var owner = getTokenOwner(token)
			if not owner:
				continue
			scores[owner] += getWegoTokenScore(token)

	if scores[white] > scores[black]:
		return {
			"winner": Constants.WHITE,
			"scores": scores
		}

	if scores[black] > scores[white]:
		return {
			"winner": Constants.BLACK,
			"scores": scores
		}

	return {
		"winner": "",
		"scores": scores
	}

static func makeMove(board, row, col, player) -> Dictionary:
	var result = MainHelper.simulateMove(board, row, col, player)

	if not result.isValid:
		print(result.message)
		result["next_player"] = player
		return result

	var next_board = result.board

	if result.winner != "":
		winner = result.winner
		updateInfo(player, str(winner) + " win!")
		result["next_player"] = ""
		return result

	if isBoardFull(next_board):
		var wegoResult = getWegoResult(next_board)
		var whiteScore = wegoResult.scores[Constants.WHITE]
		var blackScore = wegoResult.scores[Constants.BLACK]

		if wegoResult.winner != "":
			winner = wegoResult.winner
			updateInfo(player, "Wego! " + str(winner) + " win! W: " + str(whiteScore) + ", B: " + str(blackScore))
			result["winner"] = winner
		else:
			updateInfo(player, "Wego draw! W: " + str(whiteScore) + ", B: " + str(blackScore))
			result["winner"] = "DRAW"

		result["next_player"] = ""
		return result

	var next_player = getOpponent(player)
	updateInfo(next_player)
	
	result["next_player"] = next_player
	return result
