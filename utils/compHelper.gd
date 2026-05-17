extends Node
class_name CompHelper

static func getTilesPath(cell):
	match cell:
		Constants.BLACK:
			return Constants.BLACK_MIGO
		Constants.WHITE:
			return Constants.WHITE_MIGO
		Constants.XBLACK:
			return Constants.BLACK_YUGO
		Constants.XWHITE:
			return Constants.WHITE_YUGO
		Constants.TBLACK:
			return Constants.TBLACK_YUGO
		Constants.TWHITE:
			return Constants.TWHITE_YUGO
		Constants.SBLACK:
			return Constants.SBLACK_YUGO
		Constants.SWHITE:
			return Constants.SWHITE_YUGO
	return "res://assets/imgs/tile.png"
