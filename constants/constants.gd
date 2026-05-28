extends Node
class_name Constants

const BOARD_SIZE = 8
const WHITE = "W";
const BLACK = "B";
const XWHITE = "XW";
const XBLACK = "XB";
const TWHITE = "TW";
const TBLACK = "TB";
const SWHITE = "SW";
const SBLACK = "SB";
const EMPTY = "";
const AI_ENABLED = false;
const HUMAN_PLAYER = WHITE;
const AI_PLAYER = BLACK;
const MAX_DEPTH = 3;
const TOP_K = 10;

const TRACE_MINIMAX = true;
const TRACE_MAX_PRINT_DEPTH = MAX_DEPTH;
const TRACE_MAX_CHILDREN_PER_NODE = TOP_K;

const TRACE_CANVAS_ENABLED = true;
const TRACE_NODE_WIDTH = 150;
const TRACE_NODE_HEIGHT = 70;
const TRACE_HORIZONTAL_GAP = 40;
const TRACE_VERTICAL_GAP = 120;

const BLACK_MIGO = "res://assets/imgs/black_migo.png"
const WHITE_MIGO = "res://assets/imgs/white_migo.png"
const BLACK_YUGO = "res://assets/imgs/black_yugo.png"
const WHITE_YUGO = "res://assets/imgs/white_yugo.png"
const TBLACK_YUGO = "res://assets/imgs/tblack_yugo.png"
const TWHITE_YUGO = "res://assets/imgs/twhite_yugo.png"
const SBLACK_YUGO = "res://assets/imgs/sblack_yugo.png"
const SWHITE_YUGO = "res://assets/imgs/swhite_yugo.png"

const AXES = [
	{ "name": "horizontal", "dr": 0, "dc": 1 },
	{ "name": "vertical", "dr": 1, "dc": 0 },
	{ "name": "diagonal-main", "dr": 1, "dc": 1 },
	{ "name": "diagonal-anti", "dr": 1, "dc": -1 }
]

const DIRECTIONS = [
	{ "dr": -1, "dc": 0 },
	{ "dr": 1, "dc": 0 },
	{ "dr": 0, "dc": 1 },
	{ "dr": 0, "dc": -1 },
	{ "dr": -1, "dc": -1 },
	{ "dr": -1, "dc": 1 },
	{ "dr": 1, "dc": -1 },
	{ "dr": 1, "dc": 1 }
]

const SCORE_TILES = [
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 3, 2, 2, 3, 1, 1],
	[1, 1, 2, 2, 2, 2, 1, 1],
	[1, 1, 2, 2, 2, 2, 1, 1],
	[1, 1, 3, 2, 2, 3, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 1, 1]
]
