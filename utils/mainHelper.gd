extends Node
class_name MainHelper

static func get_cell_id(row, col):
	return "%d_%d" % [row, col]

static func clone_board(source_board):
	var new_board = []

	for row in source_board:
		new_board.append(row.duplicate())

	return new_board

static func create_empty_board():
	var board = []

	for row in range(Constants.BOARD_SIZE):
		var row_array = []
		
		for col in range(Constants.BOARD_SIZE):
			row_array.append(Constants.EMPTY)
		
		board.append(row_array)

	return board

static func makeMove(sourceBoard, row, col, currentPlayer):
	if sourceBoard[row][col] != Constants.EMPTY:
		return {
			"isValid" : false,
			"message" : "Cell already filled."
		}
	
	var newBoard = clone_board(sourceBoard)
	newBoard[row][col] = currentPlayer
	
	return {
		"isValid" : true,
		"board" : newBoard,
	}
	
static func simulateMove(sourceBoard, row, col, player):
	pass
