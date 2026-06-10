extends Node
class_name AIConstants

const SCORE_TILES := [
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 3, 2, 2, 3, 1, 1],
	[1, 1, 2, 2, 2, 2, 1, 1],
	[1, 1, 2, 2, 2, 2, 1, 1],
	[1, 1, 3, 2, 2, 3, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1],
]

const CENTER_TILES = [
	{ "row": 3 , "col": 3 },
	{ "row": 3 , "col": 4 },
	{ "row": 4 , "col": 3 },
	{ "row": 4 , "col": 4 },
]

const MAX_DEPTH = 5;
const TOP_K = 3;
const DEBUG_MINIMAX = true

const BLOCK_YUGO = 7000
const DIRECT_YUGO = 7500

const DIRECT_SPECIAL_THREE_YUGO = 70000
const BLOCK_SPECIAL_THREE_YUGO = 90000

const BLOCK_IGO = 900_000_000
const OPEN_OPPONENT_IGO = 950_000_000
const WIN_SCORE = 1_000_000_000

# ============================================
