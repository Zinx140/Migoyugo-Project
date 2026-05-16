const BOARD_SIZE = 8;
const WHITE = "W";
const BLACK = "B";
const EMPTY = "";

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

let TRACE_CANVAS = null;
let TRACE_CTX = null;
const AI_ENABLED = false;
const HUMAN_PLAYER = WHITE;
const AI_PLAYER = BLACK;

const SCORE_TILES = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 3, 2, 2, 3, 1, 1],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 3, 2, 2, 3, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

const AXES = [
  { name: "horizontal", dr: 0, dc: 1 },
  { name: "vertical", dr: 1, dc: 0 },
  { name: "diagonal-main", dr: 1, dc: 1 },
  { name: "diagonal-anti", dr: 1, dc: -1 },
];

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

let board = createEmptyBoard();
let currentPlayer = WHITE;
let winner = "";

let TEXT_INFO = null;
let MAIN_CONTAINER = null;

// ===============================
// PRIORITY QUEUE
// ===============================
class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(element, priority) {
    this.items.push({ element, priority });
    this.items.sort((a, b) => b.priority - a.priority);
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

// ===============================
// INITIALIZATION & DOM
// ===============================
function initGame() {
  TEXT_INFO = document.getElementById("info");
  MAIN_CONTAINER = document.getElementById("main_container");

  initBoardButtons();
  renderBoard();
  updateInfo();
  initMinimaxCanvas();

  if (AI_ENABLED && currentPlayer === AI_PLAYER) {
    setTimeout(makeAIMove, 300);
  }
}

function initBoardButtons() {
  MAIN_CONTAINER.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const btn = document.createElement("button");
      btn.id = getCellId(row, col);
      btn.style.width = "50px";
      btn.style.height = "50px";
      btn.style.border = "none";
      btn.addEventListener("click", handleCellClick);

      MAIN_CONTAINER.appendChild(btn);
    }
  }
}

function renderBoard() {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.getElementById(getCellId(row, col));
      cell.textContent = board[row][col];
    }
  }
}

function updateInfo(message = "") {
  if (!TEXT_INFO) return;

  if (message) {
    TEXT_INFO.innerText = message;
    return;
  }

  TEXT_INFO.innerText = `Turn: ${currentPlayer}`;
}

function getCellId(row, col) {
  return `${row + 1}-${col + 1}`;
}

function parseCellId(id) {
  const [row, col] = id.split("-").map(Number);

  return {
    row: row - 1,
    col: col - 1,
  };
}

// ===============================
// BOARD HELPERS
// ===============================
function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => EMPTY),
  );
}

function cloneBoard(sourceBoard) {
  return sourceBoard.map((row) => [...row]);
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isBoardFull(sourceBoard) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] === EMPTY) {
        return false;
      }
    }
  }

  return true;
}

function getWegoResult(sourceBoard) {
  const scores = {
    [WHITE]: 0,
    [BLACK]: 0,
  };

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const token = sourceBoard[row][col];
      const owner = getTokenOwner(token);

      if (!owner) continue;

      scores[owner] += getWegoTokenScore(token);
    }
  }

  if (scores[WHITE] > scores[BLACK]) {
    return {
      winner: WHITE,
      scores,
    };
  }

  if (scores[BLACK] > scores[WHITE]) {
    return {
      winner: BLACK,
      scores,
    };
  }

  return {
    winner: "",
    scores,
  };
}

function getWegoTokenScore(token) {
  if (token.startsWith("S")) return 3;
  if (token.startsWith("T")) return 2;
  if (token.startsWith("X")) return 1;

  return 0;
}

function evaluateWegoBoard(sourceBoard) {
  const result = getWegoResult(sourceBoard);
  const aiScore = result.scores[AI_PLAYER];
  const humanScore = result.scores[HUMAN_PLAYER];

  if (aiScore > humanScore) return 100000;
  if (humanScore > aiScore) return -100000;

  return 0;
}

function getOpponent(player) {
  return player === WHITE ? BLACK : WHITE;
}

function getTokenOwner(token) {
  if (!token) return null;
  if (token.endsWith(WHITE)) return WHITE;
  if (token.endsWith(BLACK)) return BLACK;

  return null;
}

function isPlayerToken(token, player) {
  return getTokenOwner(token) === player;
}

function isBasicToken(token, player) {
  return token === player;
}

function isSpecialToken(token, player) {
  return (
    token === `X${player}` || token === `T${player}` || token === `S${player}`
  );
}

// ===============================
// MAIN TURN FLOW
// ===============================
function handleCellClick(event) {
  if (winner) return;

  if (AI_ENABLED && currentPlayer === AI_PLAYER) {
    return;
  }

  const { row, col } = parseCellId(event.target.id);
  makeMove(row, col, currentPlayer);

  if (AI_ENABLED && !winner && currentPlayer === AI_PLAYER) {
    setTimeout(makeAIMove, 300);
  }
}

function makeMove(row, col, player) {
  const result = simulateMove(board, row, col, player);

  if (!result.isValid) {
    alert(result.message);
    return false;
  }

  board = result.board;
  renderBoard();

  if (result.winner) {
    winner = result.winner;
    updateInfo(`${winner} win!`);
    return true;
  }

  if (isBoardFull(board)) {
    const wegoResult = getWegoResult(board);
    const whiteScore = wegoResult.scores[WHITE];
    const blackScore = wegoResult.scores[BLACK];

    if (wegoResult.winner) {
      winner = wegoResult.winner;
      updateInfo(`Wego! ${winner} win! W: ${whiteScore}, B: ${blackScore}`);
    } else {
      updateInfo(`Wego draw! W: ${whiteScore}, B: ${blackScore}`);
    }

    return true;
  }

  currentPlayer = getOpponent(currentPlayer);
  updateInfo();

  return true;
}

function resetBoard() {
  board = createEmptyBoard();
  currentPlayer = WHITE;
  winner = "";

  renderBoard();
  updateInfo();
}

// ===============================
// MOVE SIMULATION
// ===============================
function simulateMove(sourceBoard, row, col, player) {
  if (!isInsideBoard(row, col)) {
    return {
      isValid: false,
      message: "Invalid position.",
    };
  }

  if (sourceBoard[row][col] !== EMPTY) {
    return {
      isValid: false,
      message: "Cell already filled.",
    };
  }

  const newBoard = cloneBoard(sourceBoard);
  newBoard[row][col] = player;

  if (!canPlaceMigo(newBoard, row, col, player)) {
    return {
      isValid: false,
      message: "Can't be placed here.",
    };
  }

  resolveYugo(newBoard, row, col, player);

  const hasIgo = isIgo(newBoard, row, col, player);

  return {
    isValid: true,
    board: newBoard,
    winner: hasIgo ? player : "",
  };
}

// ===============================
// MIGO VALIDATION
// Tidak boleh membentuk lebih dari 4 token searah.
// ===============================
function canPlaceMigo(sourceBoard, row, col, player) {
  for (const axis of AXES) {
    const total = countLineLength(
      sourceBoard,
      row,
      col,
      axis.dr,
      axis.dc,
      player,
    );

    if (total > 4) {
      return false;
    }
  }

  return true;
}

function countLineLength(sourceBoard, row, col, dr, dc, player) {
  const connectedCells = collectConnectedCells(
    sourceBoard,
    row,
    col,
    dr,
    dc,
    player,
  );
  return 1 + connectedCells.length;
}

function collectConnectedCells(sourceBoard, row, col, dr, dc, player) {
  const cells = [];

  collectOneDirection(sourceBoard, row, col, dr, dc, player, cells);
  collectOneDirection(sourceBoard, row, col, -dr, -dc, player, cells);

  return cells;
}

function collectOneDirection(sourceBoard, row, col, dr, dc, player, cells) {
  let currentRow = row + dr;
  let currentCol = col + dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isPlayerToken(sourceBoard[currentRow][currentCol], player)
  ) {
    cells.push({ row: currentRow, col: currentCol });

    currentRow += dr;
    currentCol += dc;
  }
}

// ===============================
// YUGO CHECK
// Jika ada 3 token terhubung dengan token yang baru ditaruh,
// maka token baru menjadi X/T/S.
// ===============================
function resolveYugo(sourceBoard, row, col, player) {
  const matchedAxes = [];
  const cellsToClear = new Map();

  for (const axis of AXES) {
    const connectedCells = collectConnectedCells(
      sourceBoard,
      row,
      col,
      axis.dr,
      axis.dc,
      player,
    );

    if (connectedCells.length === 3) {
      matchedAxes.push(axis.name);

      for (const cell of connectedCells) {
        const token = sourceBoard[cell.row][cell.col];

        if (isBasicToken(token, player)) {
          cellsToClear.set(`${cell.row}-${cell.col}`, cell);
        }
      }
    }
  }

  if (matchedAxes.length === 0) {
    return 0;
  }

  for (const cell of cellsToClear.values()) {
    sourceBoard[cell.row][cell.col] = EMPTY;
  }

  if (matchedAxes.length > 3) {
    sourceBoard[row][col] = `S${player}`;
  } else if (matchedAxes.length > 1) {
    sourceBoard[row][col] = `T${player}`;
  } else {
    sourceBoard[row][col] = `X${player}`;
  }

  return matchedAxes.length;
}

// ===============================
// IGO CHECK
// Menang jika ada 4 special token milik player yang tersambung.
// ===============================
function isIgo(sourceBoard, row, col, player) {
  const selectedToken = sourceBoard[row][col];

  if (!isSpecialToken(selectedToken, player)) {
    return false;
  }

  let count = 1;

  for (const direction of DIRECTIONS) {
    count += countSpecialTokenInDirection(
      sourceBoard,
      row,
      col,
      direction.dr,
      direction.dc,
      player,
    );
  }

  return count === 4;
}

function countSpecialTokenInDirection(sourceBoard, row, col, dr, dc, player) {
  let count = 0;
  let currentRow = row + dr;
  let currentCol = col + dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isSpecialToken(sourceBoard[currentRow][currentCol], player)
  ) {
    count++;

    currentRow += dr;
    currentCol += dc;
  }

  return count;
}

// ===============================
// AI: MINIMAX + ALPHA BETA + PRIORITY QUEUE
// ===============================
function makeAIMove() {
  if (!AI_ENABLED || winner || currentPlayer !== AI_PLAYER) return;

  const bestMove = getBestMoveForAI(board);

  if (!bestMove) {
    updateInfo("AI has no valid move.");
    return;
  }

  makeMove(bestMove.row, bestMove.col, AI_PLAYER);
}

function getBestMoveForAI(sourceBoard) {
  const moves = getTopMoves(sourceBoard, AI_PLAYER, TOP_K);

  let bestMove = null;
  let bestScore = -Infinity;

  const traceRoot = createTraceNode({
    type: "ROOT",
    player: AI_PLAYER,
    depth: MAX_DEPTH,
    move: null,
    alpha: -Infinity,
    beta: Infinity,
  });

  for (const item of moves) {
    const move = item.element;

    const traceChild = createTraceNode({
      type: "AI_CANDIDATE",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move,
      alpha: -Infinity,
      beta: Infinity,
      priority: item.priority,
    });

    traceRoot.children.push(traceChild);

    const score = move.winner
      ? 100000
      : miniMaxAlphaBetaPrunning(
          move.board,
          MAX_DEPTH - 1,
          -Infinity,
          Infinity,
          HUMAN_PLAYER,
          traceChild,
        );

    traceChild.score = score;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  traceRoot.score = bestScore;
  traceRoot.bestMove = bestMove;

  printMinimaxTrace(traceRoot);

  return bestMove;
}

function miniMaxAlphaBetaPrunning(
  sourceBoard,
  depth,
  alpha,
  beta,
  player,
  traceNode = null,
) {
  if (traceNode) {
    traceNode.player = player;
    traceNode.depth = depth;
    traceNode.alphaStart = alpha;
    traceNode.betaStart = beta;
    traceNode.nodeType = player === AI_PLAYER ? "MAX" : "MIN";
  }

  if (isBoardFull(sourceBoard)) {
    const score = evaluateWegoBoard(sourceBoard);

    if (traceNode) {
      traceNode.reason = "WEGO_BOARD_FULL";
      traceNode.score = score;
      traceNode.alphaEnd = alpha;
      traceNode.betaEnd = beta;
    }

    return score;
  }

  if (depth === 0) {
    const score = evaluateBoard(sourceBoard);

    if (traceNode) {
      traceNode.reason = "DEPTH_LIMIT";
      traceNode.score = score;
      traceNode.alphaEnd = alpha;
      traceNode.betaEnd = beta;
    }

    return score;
  }

  const moves = getTopMoves(sourceBoard, player, TOP_K);

  if (moves.length === 0) {
    const score = evaluateBoard(sourceBoard);

    if (traceNode) {
      traceNode.reason = "NO_VALID_MOVES";
      traceNode.score = score;
      traceNode.alphaEnd = alpha;
      traceNode.betaEnd = beta;
    }

    return score;
  }

  if (player === AI_PLAYER) {
    let bestScore = -Infinity;

    for (const item of moves) {
      const move = item.element;
      const childTrace = createTraceNode({
        type: "MAX_CHILD",
        player,
        depth,
        move,
        alpha,
        beta,
        priority: item.priority,
      });

      if (traceNode) traceNode.children.push(childTrace);

      const score = move.winner
        ? 100000 + depth
        : miniMaxAlphaBetaPrunning(
            move.board,
            depth - 1,
            alpha,
            beta,
            getOpponent(player),
            childTrace,
          );

      childTrace.score = score;
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);

      if (traceNode) {
        traceNode.currentBest = bestScore;
        traceNode.alphaEnd = alpha;
        traceNode.betaEnd = beta;
      }

      if (beta <= alpha) {
        if (traceNode) {
          traceNode.pruned = true;
          traceNode.pruneReason = `beta (${formatScore(beta)}) <= alpha (${formatScore(alpha)})`;
        }
        break;
      }
    }

    if (traceNode) {
      traceNode.score = bestScore;
      traceNode.alphaEnd = alpha;
      traceNode.betaEnd = beta;
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const item of moves) {
    const move = item.element;
    const childTrace = createTraceNode({
      type: "MIN_CHILD",
      player,
      depth,
      move,
      alpha,
      beta,
      priority: item.priority,
    });

    if (traceNode) traceNode.children.push(childTrace);

    const score = move.winner
      ? -100000 - depth
      : miniMaxAlphaBetaPrunning(
          move.board,
          depth - 1,
          alpha,
          beta,
          getOpponent(player),
          childTrace,
        );

    childTrace.score = score;
    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, bestScore);

    if (traceNode) {
      traceNode.currentBest = bestScore;
      traceNode.alphaEnd = alpha;
      traceNode.betaEnd = beta;
    }

    if (beta <= alpha) {
      if (traceNode) {
        traceNode.pruned = true;
        traceNode.pruneReason = `beta (${formatScore(beta)}) <= alpha (${formatScore(alpha)})`;
      }
      break;
    }
  }

  if (traceNode) {
    traceNode.score = bestScore;
    traceNode.alphaEnd = alpha;
    traceNode.betaEnd = beta;
  }

  return bestScore;
}

function getTopMoves(sourceBoard, player, limit = TOP_K) {
  const pq = new PriorityQueue();

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const score = evaluateBoard(result.board);
      const priority = player === AI_PLAYER ? score : -score;

      pq.enqueue(
        {
          row,
          col,
          board: result.board,
          winner: result.winner,
        },
        priority,
      );
    }
  }

  const moves = [];

  while (!pq.isEmpty() && moves.length < limit) {
    moves.push(pq.dequeue());
  }

  return moves;
}

function evaluateBoard(sourceBoard) {
  let score = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const token = sourceBoard[row][col];
      if (token === EMPTY) continue;

      const owner = getTokenOwner(token);
      const tokenScore = getTokenScore(token) + SCORE_TILES[row][col];

      if (owner === AI_PLAYER) {
        score += tokenScore;
      } else {
        score -= tokenScore;
      }
    }
  }

  return score;
}

function getTokenScore(token) {
  if (token.startsWith("S")) return 60;
  if (token.startsWith("T")) return 40;
  if (token.startsWith("X")) return 25;
  return 10;
}

// ===============================
// MINIMAX TRACE / TREE LOG
// ===============================
function createTraceNode({
  type,
  player,
  depth,
  move,
  alpha,
  beta,
  priority = null,
}) {
  return {
    type,
    nodeType: player === AI_PLAYER ? "MAX" : "MIN",
    player,
    depth,
    move: move ? { row: move.row, col: move.col } : null,
    priority,
    score: null,
    currentBest: null,
    alphaStart: alpha,
    betaStart: beta,
    alphaEnd: alpha,
    betaEnd: beta,
    reason: "",
    pruned: false,
    pruneReason: "",
    children: [],
  };
}

function printMinimaxTrace(root) {
  if (!TRACE_MINIMAX) return;

  drawMinimaxTraceTree(root);

  console.clear();
  console.log("================ MINIMAX TRACE TREE ================");
  console.log(`AI Player: ${AI_PLAYER}, Human Player: ${HUMAN_PLAYER}`);
  console.log(`MAX_DEPTH: ${MAX_DEPTH}, TOP_K: ${TOP_K}`);
  console.log(
    `Best Move: ${formatMove(root.bestMove)} | Best Score: ${formatScore(root.score)}`,
  );
  console.log("====================================================");
  console.log(formatTraceNode(root));

  const children = root.children.slice(0, TRACE_MAX_CHILDREN_PER_NODE);

  children.forEach((child, index) => {
    const isLast = index === children.length - 1;
    printTraceBranch(child, "", isLast, 1);
  });

  drawMinimaxTraceTree(root);
}

function printTraceBranch(node, prefix, isLast, level) {
  if (level > TRACE_MAX_PRINT_DEPTH + 1) return;

  const connector = isLast ? "└── " : "├── ";
  console.log(prefix + connector + formatTraceNode(node));

  const nextPrefix = prefix + (isLast ? "    " : "│   ");
  const children = node.children.slice(0, TRACE_MAX_CHILDREN_PER_NODE);

  children.forEach((child, index) => {
    const childIsLast = index === children.length - 1;
    printTraceBranch(child, nextPrefix, childIsLast, level + 1);
  });
}

function formatTraceNode(node) {
  const moveText = node.move ? formatMove(node.move) : "START";
  const scoreText = formatScore(node.score);
  const priorityText =
    node.priority === null ? "" : ` | priority=${formatScore(node.priority)}`;
  const alphaText = `α:${formatScore(node.alphaStart)}→${formatScore(node.alphaEnd)}`;
  const betaText = `β:${formatScore(node.betaStart)}→${formatScore(node.betaEnd)}`;
  const reasonText = node.reason ? ` | ${node.reason}` : "";
  const pruneText = node.pruned ? ` | ✂ PRUNED: ${node.pruneReason}` : "";

  return `[${node.nodeType}] player=${node.player} depth=${node.depth} move=${moveText} score=${scoreText}${priorityText} | ${alphaText} | ${betaText}${reasonText}${pruneText}`;
}

function formatMove(move) {
  if (!move) return "-";
  return `${move.row + 1}-${move.col + 1}`;
}

function formatScore(value) {
  if (value === Infinity) return "+∞";
  if (value === -Infinity) return "-∞";
  if (value === null || value === undefined) return "?";

  return value;
}

// ===============================
// MINIMAX TRACE CANVAS
// Tree canvas ini otomatis berubah setiap AI bergerak,
// karena drawMinimaxTraceTree(root) dipanggil dari printMinimaxTrace(root).
// ===============================
function initMinimaxCanvas() {
  if (!TRACE_CANVAS_ENABLED) return;

  let wrapper = document.getElementById("trace_canvas_wrapper");

  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "trace_canvas_wrapper";
    wrapper.style.width = "100%";
    wrapper.style.height = "500px";
    wrapper.style.overflow = "auto";
    wrapper.style.border = "1px solid #ccc";
    wrapper.style.background = "#f9f9f9";
    wrapper.style.marginTop = "20px";

    document.body.appendChild(wrapper);
  }

  TRACE_CANVAS = document.getElementById("minimax_tree_canvas");

  if (!TRACE_CANVAS) {
    TRACE_CANVAS = document.createElement("canvas");
    TRACE_CANVAS.id = "minimax_tree_canvas";
    TRACE_CANVAS.width = 2000;
    TRACE_CANVAS.height = 1200;
    TRACE_CANVAS.style.background = "white";

    wrapper.appendChild(TRACE_CANVAS);
  }

  TRACE_CTX = TRACE_CANVAS.getContext("2d");
}

function drawMinimaxTraceTree(root) {
  if (!TRACE_CANVAS_ENABLED) return;

  if (!TRACE_CANVAS || !TRACE_CTX) {
    initMinimaxCanvas();
  }

  if (!TRACE_CANVAS || !TRACE_CTX) return;

  const drawableRoot = cloneTraceForDrawing(root, 0);
  const treeWidth = calculateTraceTreeWidth(drawableRoot);
  const treeHeight = calculateTraceTreeHeight(drawableRoot);

  TRACE_CANVAS.width = Math.max(1200, treeWidth + 120);
  TRACE_CANVAS.height = Math.max(700, treeHeight + 120);

  TRACE_CTX.clearRect(0, 0, TRACE_CANVAS.width, TRACE_CANVAS.height);
  TRACE_CTX.font = "12px Arial";
  TRACE_CTX.textAlign = "center";
  TRACE_CTX.textBaseline = "middle";

  const startX = TRACE_CANVAS.width / 2;
  const startY = 50;

  assignTraceNodePositions(drawableRoot, startX, startY);
  drawTraceConnections(drawableRoot);
  drawTraceNodes(drawableRoot);
}

function cloneTraceForDrawing(node, level) {
  const children =
    level >= TRACE_MAX_PRINT_DEPTH + 1
      ? []
      : node.children
          .slice(0, TRACE_MAX_CHILDREN_PER_NODE)
          .map((child) => cloneTraceForDrawing(child, level + 1));

  return {
    ...node,
    children,
    drawX: 0,
    drawY: 0,
    subtreeWidth: 0,
  };
}

function calculateTraceTreeWidth(node) {
  if (!node.children.length) {
    node.subtreeWidth = TRACE_NODE_WIDTH + TRACE_HORIZONTAL_GAP;
    return node.subtreeWidth;
  }

  const totalChildrenWidth = node.children.reduce((total, child) => {
    return total + calculateTraceTreeWidth(child);
  }, 0);

  node.subtreeWidth = Math.max(
    TRACE_NODE_WIDTH + TRACE_HORIZONTAL_GAP,
    totalChildrenWidth,
  );

  return node.subtreeWidth;
}

function calculateTraceTreeHeight(node) {
  if (!node.children.length) {
    return TRACE_NODE_HEIGHT;
  }

  const childHeights = node.children.map(calculateTraceTreeHeight);
  return TRACE_NODE_HEIGHT + TRACE_VERTICAL_GAP + Math.max(...childHeights);
}

function assignTraceNodePositions(node, centerX, y) {
  node.drawX = centerX;
  node.drawY = y;

  if (!node.children.length) return;

  let currentX = centerX - node.subtreeWidth / 2;

  for (const child of node.children) {
    const childCenterX = currentX + child.subtreeWidth / 2;
    assignTraceNodePositions(child, childCenterX, y + TRACE_VERTICAL_GAP);
    currentX += child.subtreeWidth;
  }
}

function drawTraceConnections(node) {
  for (const child of node.children) {
    TRACE_CTX.beginPath();
    TRACE_CTX.moveTo(node.drawX, node.drawY + TRACE_NODE_HEIGHT / 2);
    TRACE_CTX.lineTo(child.drawX, child.drawY - TRACE_NODE_HEIGHT / 2);
    TRACE_CTX.strokeStyle = child.pruned ? "#cc0000" : "#555";
    TRACE_CTX.lineWidth = child.pruned ? 2 : 1;
    TRACE_CTX.stroke();

    drawTraceConnections(child);
  }
}

function drawTraceNodes(node) {
  drawTraceNode(node);

  for (const child of node.children) {
    drawTraceNodes(child);
  }
}

function drawTraceNode(node) {
  const x = node.drawX;
  const y = node.drawY;
  const w = TRACE_NODE_WIDTH;
  const h = TRACE_NODE_HEIGHT;

  TRACE_CTX.beginPath();
  TRACE_CTX.roundRect(x - w / 2, y - h / 2, w, h, 10);
  TRACE_CTX.fillStyle = getTraceNodeColor(node);
  TRACE_CTX.fill();
  TRACE_CTX.strokeStyle = node.pruned ? "#cc0000" : "#333";
  TRACE_CTX.lineWidth = node.pruned ? 3 : 1;
  TRACE_CTX.stroke();

  TRACE_CTX.fillStyle = "#111";

  const lines = [
    `${node.nodeType} | ${node.player}`,
    `move: ${formatMove(node.move)}`,
    `score: ${formatScore(node.score)}`,
    `α ${formatScore(node.alphaStart)}→${formatScore(node.alphaEnd)} | β ${formatScore(node.betaStart)}→${formatScore(node.betaEnd)}`,
  ];

  lines.forEach((line, index) => {
    TRACE_CTX.fillText(line, x, y - 24 + index * 16);
  });

  if (node.pruned) {
    TRACE_CTX.fillStyle = "#cc0000";
    TRACE_CTX.fillText("PRUNED", x, y + 38);
  }
}

function getTraceNodeColor(node) {
  if (node.pruned) return "#ffe6e6";
  if (node.nodeType === "MAX") return "#e8f3ff";
  if (node.nodeType === "MIN") return "#fff3d8";
  return "#ffffff";
}

// ===============================
// GLOBAL EXPORTS FOR HTML BUTTONS
// ===============================
window.resetBoard = resetBoard;
window.makeAIMove = makeAIMove;

// Start game after DOM is ready.
document.addEventListener("DOMContentLoaded", initGame);
