const BOARD_SIZE = 8;
const WHITE = "W";
const BLACK = "B";
const EMPTY = "";

const MAX_DEPTH = 3;
const TOP_K = 5;

const AI_ENABLED = true;
const HUMAN_PLAYER = WHITE;
const AI_PLAYER = BLACK;

// Kalau ingin AI jalan dulu, ubah menjadi:
// let currentPlayer = AI_PLAYER;
let currentPlayer = WHITE;

const HEURISTIC_WEIGHTS = {
  MOVE_YUGO: 800,
  FUTURE_YUGO: 120,

  DIRECT_YUGO: 6000,
  GAP_YUGO: -2500,

  OPEN_SPECIAL_THREE: 50000,
  CLOSED_SPECIAL_THREE: 8000,

  SPECIAL_PAIR_EXTENSION: 45000,
  OPEN_SPECIAL_PAIR_EXTENSION: 65000,
  GAP_SPECIAL_THREE: -70000,

  BLOCK_YUGO: 300,
  BLOCK_IGO: 10000,

  OPPONENT_YUGO_THREAT: -1500,
  OPPONENT_IGO_THREAT: -20000,

  OPEN_OPPONENT_IGO: -500000,

  UNBLOCKABLE_OPPONENT_IGO_THREAT: -300000,
  OPEN_UNBLOCKABLE_OPPONENT_IGO: -500000,

  OPPONENT_FORCING_UNBLOCKABLE_IGO: -250000,
  OPEN_OPPONENT_FORCING_UNBLOCKABLE_IGO: -400000,
  BLOCK_OPPONENT_FORCING_UNBLOCKABLE_IGO: 300000,

  OWN_INVALID_MOVE: -5,
  OPPONENT_INVALID_MOVE: 5,

  OPPONENT_OPEN_SPECIAL_THREE_THREAT: -25000,
  OPEN_OPPONENT_SPECIAL_THREE: -40000,
  BLOCK_OPPONENT_OPEN_SPECIAL_THREE: 20000,

  SELF_OPEN_SPECIAL_THREE: 70000,
  SELF_CLOSED_SPECIAL_THREE: 15000,

  POSITION_TILE: 0.2,
};

const WIN_NOW_SCORE = 1_000_000_000;
const LOSE_NEXT_TURN_SCORE = -900_000_000;

const TRACE_CANVAS_ENABLED = true;
const TRACE_MAX_DRAW_DEPTH = 3;
const TRACE_MAX_DRAW_CHILDREN = 5;

const TRACE_NODE_WIDTH = 230;
const TRACE_NODE_HEIGHT = 185;
const TRACE_HORIZONTAL_GAP = 60;
const TRACE_VERTICAL_GAP = 240;

const TRACE_MAX_CANVAS_WIDTH = 16000;
const TRACE_MAX_CANVAS_HEIGHT = 8000;

let TRACE_CANVAS = null;
let TRACE_CTX = null;

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
let winner = "";

let TEXT_INFO = null;
let MAIN_CONTAINER = null;

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
    return { winner: WHITE, scores };
  }

  if (scores[BLACK] > scores[WHITE]) {
    return { winner: BLACK, scores };
  }

  return { winner: "", scores };
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

function handleCellClick(event) {
  if (winner) return;

  if (AI_ENABLED && currentPlayer === AI_PLAYER) {
    return;
  }

  const { row, col } = parseCellId(event.target.id);
  const success = makeMove(row, col, currentPlayer);

  if (!success) return;

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
  drawEmptyTraceCanvas();

  if (AI_ENABLED && currentPlayer === AI_PLAYER) {
    setTimeout(makeAIMove, 300);
  }
}

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

function isIgo(sourceBoard, row, col, player) {
  const selectedToken = sourceBoard[row][col];

  if (!isSpecialToken(selectedToken, player)) {
    return false;
  }

  for (const axis of AXES) {
    const total =
      1 +
      countSpecialInOneDirection(
        sourceBoard,
        row,
        col,
        axis.dr,
        axis.dc,
        player,
      ) +
      countSpecialInOneDirection(
        sourceBoard,
        row,
        col,
        -axis.dr,
        -axis.dc,
        player,
      );

    if (total >= 4) {
      return true;
    }
  }

  return false;
}

function countSpecialInOneDirection(sourceBoard, row, col, dr, dc, player) {
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

function countConnectedSpecialTokens(sourceBoard, startRow, startCol, player) {
  const visited = new Set();
  const stack = [
    {
      row: startRow,
      col: startCol,
    },
  ];

  let count = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    const key = `${current.row}-${current.col}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (!isInsideBoard(current.row, current.col)) continue;

    const token = sourceBoard[current.row][current.col];

    if (!isSpecialToken(token, player)) continue;

    count++;

    for (const direction of DIRECTIONS) {
      const nextRow = current.row + direction.dr;
      const nextCol = current.col + direction.dc;
      const nextKey = `${nextRow}-${nextCol}`;

      if (
        isInsideBoard(nextRow, nextCol) &&
        !visited.has(nextKey) &&
        isSpecialToken(sourceBoard[nextRow][nextCol], player)
      ) {
        stack.push({
          row: nextRow,
          col: nextCol,
        });
      }
    }
  }

  return count;
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

function getForcedBlockOpponentSpecialSetupMove(sourceBoard, player) {
  const opponent = getOpponent(player);

  let bestMove = null;
  let bestPriority = -Infinity;

  for (const axis of AXES) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cells = getLineWindowCells(row, col, axis.dr, axis.dc, 5);

        if (!cells) continue;

        const tokens = cells.map((cell) => sourceBoard[cell.row][cell.col]);

        // Pattern utama:
        // _ _ XW XW W
        // blokir index 1
        const patternLeft =
          tokens[0] === EMPTY &&
          tokens[1] === EMPTY &&
          isSpecialToken(tokens[2], opponent) &&
          isSpecialToken(tokens[3], opponent) &&
          isBasicToken(tokens[4], opponent);

        if (patternLeft) {
          const blockCell = cells[1];

          const move = createForcedBlockMoveFromCell(
            sourceBoard,
            player,
            opponent,
            blockCell,
            "BLOCK_PATTERN_EMPTY_EMPTY_SPECIAL_SPECIAL_BASIC",
          );

          if (move && move.priority > bestPriority) {
            bestPriority = move.priority;
            bestMove = move;
          }
        }

        // Pattern kebalikannya:
        // W XW XW _ _
        // blokir index 3
        const patternRight =
          isBasicToken(tokens[0], opponent) &&
          isSpecialToken(tokens[1], opponent) &&
          isSpecialToken(tokens[2], opponent) &&
          tokens[3] === EMPTY &&
          tokens[4] === EMPTY;

        if (patternRight) {
          const blockCell = cells[3];

          const move = createForcedBlockMoveFromCell(
            sourceBoard,
            player,
            opponent,
            blockCell,
            "BLOCK_PATTERN_BASIC_SPECIAL_SPECIAL_EMPTY_EMPTY",
          );

          if (move && move.priority > bestPriority) {
            bestPriority = move.priority;
            bestMove = move;
          }
        }
      }
    }
  }

  return bestMove;
}

function createForcedBlockMoveFromCell(
  sourceBoard,
  player,
  opponent,
  blockCell,
  reason,
) {
  const opponentTest = simulateMove(
    sourceBoard,
    blockCell.row,
    blockCell.col,
    opponent,
  );

  if (!opponentTest.isValid) return null;

  const opponentYugoScore = getMoveYugoScore(
    opponentTest.board,
    blockCell.row,
    blockCell.col,
    opponent,
  );

  if (opponentYugoScore <= 0 && opponentTest.winner !== opponent) {
    return null;
  }

  const blockResult = simulateMove(
    sourceBoard,
    blockCell.row,
    blockCell.col,
    player,
  );

  if (!blockResult.isValid) return null;

  // PENTING:
  // Jangan blokir Yugo kalau block itu membuka Igo lawan.
  if (doesMoveAllowOpponentIgo(blockResult.board, player)) {
    return null;
  }

  const details = getMoveScoreDetails(
    sourceBoard,
    blockCell.row,
    blockCell.col,
    player,
    blockResult,
  );

  const priority =
    9000000 +
    opponentYugoScore * 100000 +
    (opponentTest.winner === opponent ? 1000000 : 0) +
    details.totalScore;

  return {
    row: blockCell.row,
    col: blockCell.col,
    board: blockResult.board,
    winner: blockResult.winner,
    details,
    priority,
    forcedReason: `${reason} | opponentYugo=${opponentYugoScore}`,
  };
}

function getLineWindowCells(startRow, startCol, dr, dc, length) {
  const cells = [];

  for (let i = 0; i < length; i++) {
    const row = startRow + dr * i;
    const col = startCol + dc * i;

    if (!isInsideBoard(row, col)) {
      return null;
    }

    cells.push({ row, col });
  }

  return cells;
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

function getImmediateYugoMove(sourceBoard, player) {
  let bestMove = null;
  let bestYugoScore = -Infinity;
  let bestTotalScore = -Infinity;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        result,
      );

      // Prioritas paling tinggi: langsung menang Igo
      if (result.winner === player) {
        return {
          row,
          col,
          board: result.board,
          winner: result.winner,
          details,
          forcedReason: "IMMEDIATE_IGO",
        };
      }

      // Ambil langkah yang langsung menghasilkan X / T / S
      if (details.moveYugoScore > 0) {
        const isBetterYugo =
          details.moveYugoScore > bestYugoScore ||
          (details.moveYugoScore === bestYugoScore &&
            details.totalScore > bestTotalScore);

        if (isBetterYugo) {
          bestYugoScore = details.moveYugoScore;
          bestTotalScore = details.totalScore;

          bestMove = {
            row,
            col,
            board: result.board,
            winner: result.winner,
            details,
            forcedReason: "IMMEDIATE_YUGO",
          };
        }
      }
    }
  }

  return bestMove;
}

function getImmediateWinningMove(sourceBoard, player) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        result,
      );

      if (result.winner === player) {
        return {
          row,
          col,
          board: result.board,
          winner: result.winner,
          details,
          forcedReason: "IMMEDIATE_IGO",
        };
      }
    }
  }

  return null;
}

function getOpponentImmediateIgoMoves(sourceBoard, opponent) {
  const winningMoves = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, opponent);

      if (!result.isValid) continue;

      if (result.winner === opponent) {
        winningMoves.push({
          row,
          col,
          board: result.board,
          winner: result.winner,
        });
      }
    }
  }

  return winningMoves;
}

function getBlockingIgoMove(sourceBoard, player) {
  const opponent = getOpponent(player);
  const opponentWinningMovesBefore = getOpponentImmediateIgoMoves(
    sourceBoard,
    opponent,
  );

  if (opponentWinningMovesBefore.length === 0) {
    return null;
  }

  let bestBlockMove = null;
  let bestBlockedCount = -Infinity;
  let bestTotalScore = -Infinity;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const opponentWinningMovesAfter = getOpponentImmediateIgoMoves(
        result.board,
        opponent,
      );

      const blockedCount =
        opponentWinningMovesBefore.length - opponentWinningMovesAfter.length;

      if (blockedCount <= 0) continue;

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        result,
      );

      const isBetterBlock =
        blockedCount > bestBlockedCount ||
        (blockedCount === bestBlockedCount &&
          details.totalScore > bestTotalScore);

      if (isBetterBlock) {
        bestBlockedCount = blockedCount;
        bestTotalScore = details.totalScore;

        bestBlockMove = {
          row,
          col,
          board: result.board,
          winner: result.winner,
          details,
          forcedReason: "BLOCK_OPPONENT_IGO",
          blockedCount,
        };
      }
    }
  }

  return bestBlockMove;
}

function getImmediateYugoMoveOnly(sourceBoard, player) {
  let bestMove = null;
  let bestOpenSpecialThree = -Infinity;
  let bestClosedSpecialThree = -Infinity;
  let bestOpenSpecialPairExtension = -Infinity;
  let bestSpecialPairExtension = -Infinity;
  let bestDirectYugo = -Infinity;
  let bestMoveYugoScore = -Infinity;
  let bestGapYugo = Infinity;
  let bestGapSpecialThree = Infinity;
  let bestTotalScore = -Infinity;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        result,
      );

      if (details.moveYugoScore <= 0) continue;

      if (doesMoveAllowOpponentIgo(result.board, player)) {
        continue;
      }

      const opponent = getOpponent(player);

      const opponentOpenSpecialThreeAfter = countOpenSpecialThreeThreats(
        result.board,
        opponent,
      );

      // Jangan ambil Yugo kalau setelah itu lawan punya _ XW XW XW _
      if (opponentOpenSpecialThreeAfter.totalScore > 0) {
        continue;
      }

      const opensOpponentIgo = doesMoveOpenOpponentIgo(
        sourceBoard,
        result.board,
        player,
      );

      // Jangan ambil Yugo kalau setelah itu lawan bisa langsung Igo.
      if (opensOpponentIgo) continue;

      const opensUnblockableOpponentIgo = doesMoveCreateUnblockableOpponentIgo(
        sourceBoard,
        result.board,
        player,
      );

      // Jangan ambil Yugo kalau setelah itu titik block Igo lawan jadi invalid.
      if (opensUnblockableOpponentIgo) continue;

      const isBetterYugo =
        details.openSpecialThreeCount > bestOpenSpecialThree ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount > bestClosedSpecialThree) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) >
            bestOpenSpecialPairExtension) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) ===
            bestOpenSpecialPairExtension &&
          (details.specialPairExtensionCount || 0) >
            bestSpecialPairExtension) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) ===
            bestOpenSpecialPairExtension &&
          (details.specialPairExtensionCount || 0) ===
            bestSpecialPairExtension &&
          details.directYugoCount > bestDirectYugo) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) ===
            bestOpenSpecialPairExtension &&
          (details.specialPairExtensionCount || 0) ===
            bestSpecialPairExtension &&
          details.directYugoCount === bestDirectYugo &&
          details.moveYugoScore > bestMoveYugoScore) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) ===
            bestOpenSpecialPairExtension &&
          (details.specialPairExtensionCount || 0) ===
            bestSpecialPairExtension &&
          details.directYugoCount === bestDirectYugo &&
          details.moveYugoScore === bestMoveYugoScore &&
          (details.gapSpecialThreeCount || 0) < bestGapSpecialThree) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) ===
            bestOpenSpecialPairExtension &&
          (details.specialPairExtensionCount || 0) ===
            bestSpecialPairExtension &&
          details.directYugoCount === bestDirectYugo &&
          details.moveYugoScore === bestMoveYugoScore &&
          (details.gapSpecialThreeCount || 0) === bestGapSpecialThree &&
          details.gapYugoCount < bestGapYugo) ||
        (details.openSpecialThreeCount === bestOpenSpecialThree &&
          details.closedSpecialThreeCount === bestClosedSpecialThree &&
          (details.openSpecialPairExtensionCount || 0) ===
            bestOpenSpecialPairExtension &&
          (details.specialPairExtensionCount || 0) ===
            bestSpecialPairExtension &&
          details.directYugoCount === bestDirectYugo &&
          details.moveYugoScore === bestMoveYugoScore &&
          (details.gapSpecialThreeCount || 0) === bestGapSpecialThree &&
          details.gapYugoCount === bestGapYugo &&
          details.totalScore > bestTotalScore);

      if (isBetterYugo) {
        bestOpenSpecialThree = details.openSpecialThreeCount;
        bestClosedSpecialThree = details.closedSpecialThreeCount;
        bestOpenSpecialPairExtension =
          details.openSpecialPairExtensionCount || 0;
        bestSpecialPairExtension = details.specialPairExtensionCount || 0;
        bestDirectYugo = details.directYugoCount;
        bestMoveYugoScore = details.moveYugoScore;
        bestGapSpecialThree = details.gapSpecialThreeCount || 0;
        bestGapYugo = details.gapYugoCount;
        bestTotalScore = details.totalScore;

        bestMove = {
          row,
          col,
          board: result.board,
          winner: result.winner,
          details,
          forcedReason:
            details.openSpecialThreeCount > 0
              ? "SAFE_OPEN_SPECIAL_THREE"
              : details.closedSpecialThreeCount > 0
                ? "SAFE_CLOSED_SPECIAL_THREE"
                : (details.openSpecialPairExtensionCount || 0) > 0
                  ? "SAFE_OPEN_SPECIAL_PAIR_EXTENSION"
                  : (details.specialPairExtensionCount || 0) > 0
                    ? "SAFE_SPECIAL_PAIR_EXTENSION"
                    : details.directYugoCount > 0
                      ? "SAFE_DIRECT_YUGO"
                      : "SAFE_GAP_YUGO",
        };
      }
    }
  }

  return bestMove;
}

function countImmediateIgoMoves(sourceBoard, player) {
  let count = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      if (result.winner === player) {
        count++;
      }
    }
  }

  return count;
}

function doesMoveOpenOpponentIgo(sourceBoard, resultBoard, player) {
  const opponent = getOpponent(player);

  const opponentIgoBefore = countImmediateIgoMoves(sourceBoard, opponent);
  const opponentIgoAfter = countImmediateIgoMoves(resultBoard, opponent);

  return opponentIgoAfter > opponentIgoBefore;
}

function getSpecialPairExtensionMove(sourceBoard, player) {
  let bestMove = null;
  let bestPriority = -Infinity;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      if (doesMoveAllowOpponentIgo(result.board, player)) continue;

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        result,
      );

      const pairScore =
        (details.openSpecialPairExtensionCount || 0) * 100000 +
        (details.specialPairExtensionCount || 0) * 70000 -
        (details.gapSpecialThreeCount || 0) * 80000 +
        details.totalScore;

      if (
        (details.openSpecialPairExtensionCount || 0) <= 0 &&
        (details.specialPairExtensionCount || 0) <= 0
      ) {
        continue;
      }

      if (pairScore > bestPriority) {
        bestPriority = pairScore;

        bestMove = {
          row,
          col,
          board: result.board,
          winner: result.winner,
          details,
          priority: pairScore,
          forcedReason:
            (details.openSpecialPairExtensionCount || 0) > 0
              ? "FORCE_OPEN_SPECIAL_PAIR_EXTENSION"
              : "FORCE_SPECIAL_PAIR_EXTENSION",
        };
      }
    }
  }

  return bestMove;
}

function isCriticalSpecialThreeBlock(move) {
  if (!move || !move.details) return false;

  // Kalau move block ini malah membuka Igo lawan, jangan pernah force.
  if ((move.details.opponentIgoAfter || 0) > 0) return false;
  if ((move.details.openedOpponentIgoCount || 0) > 0) return false;
  if ((move.details.unblockableOpponentIgoAfter || 0) > 0) return false;
  if ((move.details.openedUnblockableOpponentIgoCount || 0) > 0) return false;

  // Force hanya kalau ancaman special-three lawan sangat besar.
  return (move.details.opponentOpenSpecialThreeAfterScore || 0) >= 3;
}

function getBestMoveForAI(sourceBoard) {
  const traceRoot = createTraceNode({
    type: "ROOT",
    nodeType: "ROOT",
    player: AI_PLAYER,
    depth: MAX_DEPTH,
    move: null,
    alpha: -Infinity,
    beta: Infinity,
  });

  // ===============================
  // 1. Kalau AI bisa menang sekarang, ambil.
  // ===============================
  const immediateWinMove = getImmediateWinningMove(sourceBoard, AI_PLAYER);

  if (immediateWinMove) {
    const forcedTrace = createTraceNode({
      type: "FORCED_MOVE",
      nodeType: "FORCED",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move: immediateWinMove,
      alpha: -Infinity,
      beta: Infinity,
      priority: 9999999,
      details: immediateWinMove.details,
    });

    forcedTrace.score = 9999999;
    forcedTrace.reason = immediateWinMove.forcedReason;

    traceRoot.children.push(forcedTrace);
    traceRoot.score = forcedTrace.score;
    traceRoot.bestMove = immediateWinMove;

    drawMinimaxTraceTree(traceRoot);

    return immediateWinMove;
  }

  // ===============================
  // 2. Kalau lawan bisa Igo 1 langkah lagi, wajib blokir.
  // ===============================
  const blockIgoMove = getBlockingIgoMove(sourceBoard, AI_PLAYER);

  if (blockIgoMove) {
    const forcedTrace = createTraceNode({
      type: "FORCED_MOVE",
      nodeType: "FORCED",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move: blockIgoMove,
      alpha: -Infinity,
      beta: Infinity,
      priority: 9999998,
      details: blockIgoMove.details,
    });

    forcedTrace.score = 9999998;
    forcedTrace.reason = `${blockIgoMove.forcedReason} (${blockIgoMove.blockedCount})`;

    traceRoot.children.push(forcedTrace);
    traceRoot.score = forcedTrace.score;
    traceRoot.bestMove = blockIgoMove;

    drawMinimaxTraceTree(traceRoot);

    return blockIgoMove;
  }

  const blockOpponentForcingUnblockableIgoMove =
    getForcedBlockOpponentUnblockableSetupMove(sourceBoard, AI_PLAYER);

  if (blockOpponentForcingUnblockableIgoMove) {
    const forcedTrace = createTraceNode({
      type: "FORCED_MOVE",
      nodeType: "FORCED",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move: blockOpponentForcingUnblockableIgoMove,
      alpha: -Infinity,
      beta: Infinity,
      priority: blockOpponentForcingUnblockableIgoMove.priority,
      details: blockOpponentForcingUnblockableIgoMove.details,
    });

    forcedTrace.score = blockOpponentForcingUnblockableIgoMove.priority;
    forcedTrace.reason = blockOpponentForcingUnblockableIgoMove.forcedReason;

    traceRoot.children.push(forcedTrace);
    traceRoot.score = forcedTrace.score;
    traceRoot.bestMove = blockOpponentForcingUnblockableIgoMove;

    drawMinimaxTraceTree(traceRoot);

    return blockOpponentForcingUnblockableIgoMove;
  }

  const forcedSpecialSetupBlockMove = getForcedBlockOpponentSpecialSetupMove(
    sourceBoard,
    AI_PLAYER,
  );

  if (
    forcedSpecialSetupBlockMove &&
    isCriticalSpecialThreeBlock(forcedSpecialSetupBlockMove)
  ) {
    const forcedTrace = createTraceNode({
      type: "FORCED_MOVE",
      nodeType: "FORCED",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move: forcedSpecialSetupBlockMove,
      alpha: -Infinity,
      beta: Infinity,
      priority: forcedSpecialSetupBlockMove.priority,
      details: forcedSpecialSetupBlockMove.details,
    });

    forcedTrace.score = forcedSpecialSetupBlockMove.priority;
    forcedTrace.reason = forcedSpecialSetupBlockMove.forcedReason;

    traceRoot.children.push(forcedTrace);
    traceRoot.score = forcedTrace.score;
    traceRoot.bestMove = forcedSpecialSetupBlockMove;

    drawMinimaxTraceTree(traceRoot);

    return forcedSpecialSetupBlockMove;
  }

  const urgentSpecialBridgeBlockMove = getUrgentOpponentSpecialBridgeBlockMove(
    sourceBoard,
    AI_PLAYER,
  );

  if (
    urgentSpecialBridgeBlockMove &&
    isCriticalSpecialThreeBlock(urgentSpecialBridgeBlockMove)
  ) {
    const forcedTrace = createTraceNode({
      type: "FORCED_MOVE",
      nodeType: "FORCED",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move: urgentSpecialBridgeBlockMove,
      alpha: -Infinity,
      beta: Infinity,
      priority: 9999997,
      details: urgentSpecialBridgeBlockMove.details,
    });

    forcedTrace.score = 9999997;
    forcedTrace.reason = urgentSpecialBridgeBlockMove.forcedReason;

    traceRoot.children.push(forcedTrace);
    traceRoot.score = forcedTrace.score;
    traceRoot.bestMove = urgentSpecialBridgeBlockMove;

    drawMinimaxTraceTree(traceRoot);

    return urgentSpecialBridgeBlockMove;
  }

  // ===============================
  // 3. Kalau tidak ada ancaman Igo lawan, baru ambil Yugo langsung.
  // ===============================
  const immediateYugoMove = getImmediateYugoMoveOnly(sourceBoard, AI_PLAYER);

  if (immediateYugoMove) {
    const forcedTrace = createTraceNode({
      type: "FORCED_MOVE",
      nodeType: "FORCED",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move: immediateYugoMove,
      alpha: -Infinity,
      beta: Infinity,
      priority: 9999997,
      details: immediateYugoMove.details,
    });

    forcedTrace.score = 9999997;
    forcedTrace.reason = immediateYugoMove.forcedReason;

    traceRoot.children.push(forcedTrace);
    traceRoot.score = forcedTrace.score;
    traceRoot.bestMove = immediateYugoMove;

    drawMinimaxTraceTree(traceRoot);

    return immediateYugoMove;
  }

  // ===============================
  // 4. Kalau tidak ada kondisi forced, baru pakai minimax.
  // ===============================
  const moves = getTopMoves(sourceBoard, AI_PLAYER, TOP_K);

  let bestMove = null;
  let bestScore = -Infinity;

  for (const item of moves) {
    const move = item.element;

    const candidateTrace = createTraceNode({
      type: "AI_MOVE",
      nodeType: "AI MOVE",
      player: AI_PLAYER,
      depth: MAX_DEPTH,
      move,
      alpha: -Infinity,
      beta: Infinity,
      priority: item.priority,
      details: move.details,
    });

    traceRoot.children.push(candidateTrace);

    let score;

    if (move.winner) {
      score = 1000000;
      candidateTrace.reason = "AI WIN";
    } else {
      const tacticalBonus = getTacticalMoveBonus(move.details);

      const minimaxTrace = createTraceNode({
        type: "MINIMAX",
        nodeType: "MIN",
        player: HUMAN_PLAYER,
        depth: MAX_DEPTH - 1,
        move: null,
        alpha: -Infinity,
        beta: Infinity,
      });

      candidateTrace.children.push(minimaxTrace);

      score =
        tacticalBonus +
        miniMaxAlphaBetaPrunning(
          move.board,
          MAX_DEPTH - 1,
          -Infinity,
          Infinity,
          HUMAN_PLAYER,
          minimaxTrace,
        );
    }

    candidateTrace.score = score;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  traceRoot.score = bestScore;
  traceRoot.bestMove = bestMove;

  drawMinimaxTraceTree(traceRoot);

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
    traceNode.alphaEnd = alpha;
    traceNode.betaEnd = beta;
    traceNode.nodeType = player === AI_PLAYER ? "MAX" : "MIN";
  }

  if (isBoardFull(sourceBoard)) {
    const score = evaluateWegoBoard(sourceBoard);

    if (traceNode) {
      traceNode.reason = "WEGO";
      traceNode.score = score;
    }

    return score;
  }

  if (depth === 0) {
    const score = evaluateStrategicBoard(sourceBoard);

    if (traceNode) {
      traceNode.reason = "DEPTH 0";
      traceNode.score = score;
    }

    return score;
  }

  const moves = getTopMoves(sourceBoard, player, TOP_K);

  if (moves.length === 0) {
    const score = evaluateBoard(sourceBoard);

    if (traceNode) {
      traceNode.reason = "NO MOVE";
      traceNode.score = score;
    }

    return score;
  }

  if (player === AI_PLAYER) {
    let bestScore = -Infinity;

    for (const item of moves) {
      const move = item.element;

      const childTrace = createTraceNode({
        type: "MAX_CHILD",
        nodeType: "MAX",
        player,
        depth,
        move,
        alpha,
        beta,
        priority: item.priority,
        details: move.details,
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
        traceNode.score = bestScore;
        traceNode.alphaEnd = alpha;
        traceNode.betaEnd = beta;
      }

      if (beta <= alpha) {
        if (traceNode) {
          traceNode.pruned = true;
          traceNode.pruneReason = "β <= α";
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
      nodeType: "MIN",
      player,
      depth,
      move,
      alpha,
      beta,
      priority: item.priority,
      details: move.details,
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
      traceNode.score = bestScore;
      traceNode.alphaEnd = alpha;
      traceNode.betaEnd = beta;
    }

    if (beta <= alpha) {
      if (traceNode) {
        traceNode.pruned = true;
        traceNode.pruneReason = "β <= α";
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

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        result,
      );

      let score = details.totalScore;

      if (result.winner === AI_PLAYER) {
        score = WIN_NOW_SCORE;
      } else if (result.winner === HUMAN_PLAYER) {
        score = -WIN_NOW_SCORE;
      } else if (doesMoveAllowOpponentIgo(result.board, player)) {
        score = player === AI_PLAYER ? LOSE_NEXT_TURN_SCORE : WIN_NOW_SCORE;
      }

      const priority = player === AI_PLAYER ? score : -score;

      pq.enqueue(
        {
          row,
          col,
          board: result.board,
          winner: result.winner,
          details,
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

function getYugoShapeDetails(sourceBoard, row, col, player) {
  let directYugoCount = 0;
  let gapYugoCount = 0;

  for (const axis of AXES) {
    const forwardCount = countPlayerInOneDirection(
      sourceBoard,
      row,
      col,
      axis.dr,
      axis.dc,
      player,
    );

    const backwardCount = countPlayerInOneDirection(
      sourceBoard,
      row,
      col,
      -axis.dr,
      -axis.dc,
      player,
    );

    const totalConnected = forwardCount + backwardCount;

    if (totalConnected !== 3) continue;

    /**
     * Direct Yugo:
     * _ X X X
     * X X X _
     *
     * Artinya 3 token berada di satu sisi.
     */
    if (forwardCount === 3 || backwardCount === 3) {
      directYugoCount++;
    }

    /**
     * Gap Yugo:
     * X _ X X
     * X X _ X
     *
     * Artinya token tersebar di dua sisi dari posisi yang dipilih.
     */
    if (forwardCount > 0 && backwardCount > 0) {
      gapYugoCount++;
    }
  }

  return {
    directYugoCount,
    gapYugoCount,
  };
}

function countPlayerInOneDirection(sourceBoard, row, col, dr, dc, player) {
  let count = 0;
  let currentRow = row + dr;
  let currentCol = col + dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isPlayerToken(sourceBoard[currentRow][currentCol], player)
  ) {
    count++;
    currentRow += dr;
    currentCol += dc;
  }

  return count;
}

// ===============================
// HEURISTIC SCORE DETAILS
// ===============================
function getMoveScoreDetails(sourceBoard, row, col, player, moveResult = null) {
  const result = moveResult || simulateMove(sourceBoard, row, col, player);

  if (!result.isValid) {
    return {
      isValid: false,
      totalScore: -Infinity,
    };
  }

  const boardAfterMove = result.board;
  const opponent = getOpponent(player);
  const direction = player === AI_PLAYER ? 1 : -1;

  const opponentForcingUnblockableBefore = countMovesThatCreateUnblockableIgo(
    sourceBoard,
    opponent,
    player,
  );

  const opponentForcingUnblockableAfter = countMovesThatCreateUnblockableIgo(
    boardAfterMove,
    opponent,
    player,
  );

  const blockedOpponentForcingUnblockableIgo = Math.max(
    0,
    opponentForcingUnblockableBefore.totalScore -
      opponentForcingUnblockableAfter.totalScore,
  );

  const openedOpponentForcingUnblockableIgo = Math.max(
    0,
    opponentForcingUnblockableAfter.totalScore -
      opponentForcingUnblockableBefore.totalScore,
  );

  const opponentOpenSpecialThreeBefore = countOpenSpecialThreeThreats(
    sourceBoard,
    opponent,
  );

  const opponentOpenSpecialThreeAfter = countOpenSpecialThreeThreats(
    boardAfterMove,
    opponent,
  );

  const blockedOpponentOpenSpecialThree = Math.max(
    0,
    opponentOpenSpecialThreeBefore.totalScore -
      opponentOpenSpecialThreeAfter.totalScore,
  );

  const openedOpponentOpenSpecialThree = Math.max(
    0,
    opponentOpenSpecialThreeAfter.totalScore -
      opponentOpenSpecialThreeBefore.totalScore,
  );

  const boardScore = evaluateBoard(boardAfterMove);

  const moveYugoScore = getMoveYugoScore(boardAfterMove, row, col, player);

  const yugoShape = getYugoShapeDetails(sourceBoard, row, col, player);

  const specialThreeLine = getSpecialThreeLineDetails(
    boardAfterMove,
    row,
    col,
    player,
  );

  const specialPairExtension = getSpecialPairExtensionDetails(
    boardAfterMove,
    row,
    col,
    player,
  );

  const gapSpecialThree = getGapSpecialThreeDetails(
    boardAfterMove,
    row,
    col,
    player,
  );

  const playerFutureYugo = countYugoOpportunities(boardAfterMove, player);

  const opponentYugoBefore = countYugoOpportunities(sourceBoard, opponent);
  const opponentYugoAfter = countYugoOpportunities(boardAfterMove, opponent);

  const blockedYugoScore = Math.max(
    0,
    opponentYugoBefore.totalScore - opponentYugoAfter.totalScore,
  );

  const opponentYugoThreatAfter = opponentYugoAfter.totalScore;

  const opponentIgoBefore = countIgoWinningMoves(sourceBoard, opponent);
  const opponentIgoAfter = countIgoWinningMoves(boardAfterMove, opponent);

  const blockedIgoCount = Math.max(0, opponentIgoBefore - opponentIgoAfter);

  const opponentIgoThreatAfter = opponentIgoAfter;

  const openedOpponentIgoCount = Math.max(
    0,
    opponentIgoAfter - opponentIgoBefore,
  );

  const unblockableOpponentIgoBefore = countUnblockableOpponentIgoThreats(
    sourceBoard,
    player,
  );

  const unblockableOpponentIgoAfter = countUnblockableOpponentIgoThreats(
    boardAfterMove,
    player,
  );

  const openedUnblockableOpponentIgoCount = Math.max(
    0,
    unblockableOpponentIgoAfter - unblockableOpponentIgoBefore,
  );

  const ownInvalidMoves = countInvalidMoves(boardAfterMove, player);
  const opponentInvalidMoves = countInvalidMoves(boardAfterMove, opponent);

  const blockOpponentForcingUnblockableIgoContribution =
    direction *
    blockedOpponentForcingUnblockableIgo *
    HEURISTIC_WEIGHTS.BLOCK_OPPONENT_FORCING_UNBLOCKABLE_IGO;

  const opponentForcingUnblockableIgoThreatContribution =
    direction *
    opponentForcingUnblockableAfter.totalScore *
    HEURISTIC_WEIGHTS.OPPONENT_FORCING_UNBLOCKABLE_IGO;

  const openOpponentForcingUnblockableIgoContribution =
    direction *
    openedOpponentForcingUnblockableIgo *
    HEURISTIC_WEIGHTS.OPEN_OPPONENT_FORCING_UNBLOCKABLE_IGO;

  const blockOpponentOpenSpecialThreeContribution =
    direction *
    blockedOpponentOpenSpecialThree *
    HEURISTIC_WEIGHTS.BLOCK_OPPONENT_OPEN_SPECIAL_THREE;

  const opponentOpenSpecialThreeThreatContribution =
    direction *
    opponentOpenSpecialThreeAfter.totalScore *
    HEURISTIC_WEIGHTS.OPPONENT_OPEN_SPECIAL_THREE_THREAT;

  const openOpponentSpecialThreeContribution =
    direction *
    openedOpponentOpenSpecialThree *
    HEURISTIC_WEIGHTS.OPEN_OPPONENT_SPECIAL_THREE;

  const moveYugoContribution =
    direction * moveYugoScore * HEURISTIC_WEIGHTS.MOVE_YUGO;

  const directYugoContribution =
    direction * yugoShape.directYugoCount * HEURISTIC_WEIGHTS.DIRECT_YUGO;

  const gapYugoContribution =
    direction * yugoShape.gapYugoCount * HEURISTIC_WEIGHTS.GAP_YUGO;

  const openSpecialThreeContribution =
    direction *
    specialThreeLine.openSpecialThreeCount *
    HEURISTIC_WEIGHTS.OPEN_SPECIAL_THREE;

  const closedSpecialThreeContribution =
    direction *
    specialThreeLine.closedSpecialThreeCount *
    HEURISTIC_WEIGHTS.CLOSED_SPECIAL_THREE;

  const specialPairExtensionContribution =
    direction *
    specialPairExtension.specialPairExtensionCount *
    HEURISTIC_WEIGHTS.SPECIAL_PAIR_EXTENSION;

  const openSpecialPairExtensionContribution =
    direction *
    specialPairExtension.openSpecialPairExtensionCount *
    HEURISTIC_WEIGHTS.OPEN_SPECIAL_PAIR_EXTENSION;

  const gapSpecialThreeContribution =
    direction *
    gapSpecialThree.gapSpecialThreeCount *
    HEURISTIC_WEIGHTS.GAP_SPECIAL_THREE;

  const futureYugoContribution =
    direction * playerFutureYugo.totalScore * HEURISTIC_WEIGHTS.FUTURE_YUGO;

  const blockYugoContribution =
    direction * blockedYugoScore * HEURISTIC_WEIGHTS.BLOCK_YUGO;

  const blockIgoContribution =
    direction * blockedIgoCount * HEURISTIC_WEIGHTS.BLOCK_IGO;

  const opponentYugoThreatContribution =
    direction *
    opponentYugoThreatAfter *
    HEURISTIC_WEIGHTS.OPPONENT_YUGO_THREAT;

  const opponentIgoThreatContribution =
    direction * opponentIgoThreatAfter * HEURISTIC_WEIGHTS.OPPONENT_IGO_THREAT;

  const openOpponentIgoContribution =
    direction * openedOpponentIgoCount * HEURISTIC_WEIGHTS.OPEN_OPPONENT_IGO;

  const unblockableOpponentIgoThreatContribution =
    direction *
    unblockableOpponentIgoAfter *
    HEURISTIC_WEIGHTS.UNBLOCKABLE_OPPONENT_IGO_THREAT;

  const openUnblockableOpponentIgoContribution =
    direction *
    openedUnblockableOpponentIgoCount *
    HEURISTIC_WEIGHTS.OPEN_UNBLOCKABLE_OPPONENT_IGO;

  const ownInvalidContribution =
    direction * ownInvalidMoves * HEURISTIC_WEIGHTS.OWN_INVALID_MOVE;

  const opponentInvalidContribution =
    direction * opponentInvalidMoves * HEURISTIC_WEIGHTS.OPPONENT_INVALID_MOVE;

  const totalScore =
    boardScore +
    moveYugoContribution +
    directYugoContribution +
    gapYugoContribution +
    openSpecialThreeContribution +
    closedSpecialThreeContribution +
    specialPairExtensionContribution +
    openSpecialPairExtensionContribution +
    gapSpecialThreeContribution +
    blockOpponentForcingUnblockableIgoContribution +
    opponentForcingUnblockableIgoThreatContribution +
    openOpponentForcingUnblockableIgoContribution +
    blockOpponentOpenSpecialThreeContribution +
    opponentOpenSpecialThreeThreatContribution +
    openOpponentSpecialThreeContribution +
    futureYugoContribution +
    blockYugoContribution +
    blockIgoContribution +
    opponentYugoThreatContribution +
    opponentIgoThreatContribution +
    openOpponentIgoContribution +
    unblockableOpponentIgoThreatContribution +
    openUnblockableOpponentIgoContribution +
    ownInvalidContribution +
    opponentInvalidContribution;

  return {
    isValid: true,
    player,
    move: formatMove({ row, col }),

    boardScore,

    moveYugoScore,
    futureYugoCount: playerFutureYugo.totalCount,
    futureYugoScore: playerFutureYugo.totalScore,

    opponentOpenSpecialThreeBeforeCount:
      opponentOpenSpecialThreeBefore.totalCount,
    opponentOpenSpecialThreeBeforeScore:
      opponentOpenSpecialThreeBefore.totalScore,
    opponentOpenSpecialThreeAfterCount:
      opponentOpenSpecialThreeAfter.totalCount,
    opponentOpenSpecialThreeAfterScore:
      opponentOpenSpecialThreeAfter.totalScore,
    blockedOpponentOpenSpecialThree,
    openedOpponentOpenSpecialThree,

    blockOpponentOpenSpecialThreeContribution,
    opponentOpenSpecialThreeThreatContribution,
    openOpponentSpecialThreeContribution,

    opponentYugoBeforeCount: opponentYugoBefore.totalCount,
    opponentYugoBeforeScore: opponentYugoBefore.totalScore,
    opponentYugoAfterCount: opponentYugoAfter.totalCount,
    opponentYugoAfterScore: opponentYugoAfter.totalScore,
    blockedYugoScore,

    opponentYugoThreatAfter,

    opponentIgoBefore,
    opponentIgoAfter,
    blockedIgoCount,
    opponentIgoThreatAfter,

    openedOpponentIgoCount,
    openOpponentIgoContribution,

    ownInvalidMoves,
    opponentInvalidMoves,

    moveYugoContribution,
    futureYugoContribution,
    blockYugoContribution,
    blockIgoContribution,
    opponentYugoThreatContribution,
    opponentIgoThreatContribution,
    openOpponentIgoContribution,
    ownInvalidContribution,
    opponentInvalidContribution,
    unblockableOpponentIgoBefore,
    unblockableOpponentIgoAfter,
    openedUnblockableOpponentIgoCount,
    unblockableOpponentIgoThreatContribution,
    openUnblockableOpponentIgoContribution,

    totalScore,
    directYugoCount: yugoShape.directYugoCount,
    gapYugoCount: yugoShape.gapYugoCount,
    directYugoContribution,
    gapYugoContribution,

    specialPairExtensionCount: specialPairExtension.specialPairExtensionCount,
    openSpecialPairExtensionCount:
      specialPairExtension.openSpecialPairExtensionCount,
    gapSpecialThreeCount: gapSpecialThree.gapSpecialThreeCount,

    specialPairExtensionContribution,
    openSpecialPairExtensionContribution,
    gapSpecialThreeContribution,

    openSpecialThreeCount: specialThreeLine.openSpecialThreeCount,
    closedSpecialThreeCount: specialThreeLine.closedSpecialThreeCount,
    bestSpecialThreeScore: specialThreeLine.bestSpecialThreeScore,
    openSpecialThreeContribution,
    closedSpecialThreeContribution,

    opponentForcingUnblockableBeforeCount:
      opponentForcingUnblockableBefore.totalCount,
    opponentForcingUnblockableBeforeScore:
      opponentForcingUnblockableBefore.totalScore,
    opponentForcingUnblockableAfterCount:
      opponentForcingUnblockableAfter.totalCount,
    opponentForcingUnblockableAfterScore:
      opponentForcingUnblockableAfter.totalScore,

    blockedOpponentForcingUnblockableIgo,
    openedOpponentForcingUnblockableIgo,

    blockOpponentForcingUnblockableIgoContribution,
    opponentForcingUnblockableIgoThreatContribution,
    openOpponentForcingUnblockableIgoContribution,
  };
}

function getMoveYugoScore(sourceBoard, row, col, player) {
  const token = sourceBoard[row][col];

  if (token === `X${player}`) return 1;
  if (token === `T${player}`) return 2;
  if (token === `S${player}`) return 3;

  return 0;
}

function countYugoOpportunities(sourceBoard, player) {
  let totalCount = 0;
  let totalScore = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const yugoScore = getMoveYugoScore(result.board, row, col, player);

      if (yugoScore > 0) {
        totalCount++;
        totalScore += yugoScore;
      }
    }
  }

  return {
    totalCount,
    totalScore,
  };
}

function countIgoWinningMoves(sourceBoard, player) {
  let total = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      if (result.winner === player) {
        total++;
      }
    }
  }

  return total;
}

function countInvalidMoves(sourceBoard, player) {
  let totalInvalid = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) {
        totalInvalid++;
      }
    }
  }

  return totalInvalid;
}

// ===============================
// BASIC BOARD EVALUATION
// ===============================
function evaluateBoard(sourceBoard) {
  let score = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const token = sourceBoard[row][col];

      if (token === EMPTY) continue;

      const owner = getTokenOwner(token);
      const tokenScore = getTokenScore(token);
      const tileScore = SCORE_TILES[row][col] * HEURISTIC_WEIGHTS.POSITION_TILE;

      if (owner === AI_PLAYER) {
        score += tokenScore + tileScore;
      } else {
        score -= tokenScore + tileScore;
      }
    }
  }

  return score;
}

function evaluateStrategicBoard(sourceBoard) {
  let score = evaluateBoard(sourceBoard);

  const aiYugo = countYugoOpportunities(sourceBoard, AI_PLAYER);
  const humanYugo = countYugoOpportunities(sourceBoard, HUMAN_PLAYER);

  const aiIgo = countIgoWinningMoves(sourceBoard, AI_PLAYER);
  const humanIgo = countIgoWinningMoves(sourceBoard, HUMAN_PLAYER);

  score += aiYugo.totalScore * 800;
  score -= humanYugo.totalScore * 1200;

  score += aiIgo * 20000;
  score -= humanIgo * 30000;

  return score;
}

function getTokenScore(token) {
  if (token.startsWith("S")) return 60;
  if (token.startsWith("T")) return 40;
  if (token.startsWith("X")) return 25;

  return 10;
}

// ===============================
// MINIMAX TRACE DATA
// ===============================
function createTraceNode({
  type,
  nodeType,
  player,
  depth,
  move,
  alpha,
  beta,
  priority = null,
  details = null,
}) {
  return {
    type,
    nodeType: nodeType || (player === AI_PLAYER ? "MAX" : "MIN"),
    player,
    depth,
    move: move ? { row: move.row, col: move.col } : null,
    priority,
    score: null,
    alphaStart: alpha,
    betaStart: beta,
    alphaEnd: alpha,
    betaEnd: beta,
    reason: "",
    pruned: false,
    pruneReason: "",
    details,
    children: [],
    bestMove: null,
    drawX: 0,
    drawY: 0,
    subtreeWidth: 0,
  };
}

function formatMove(move) {
  if (!move) return "START";
  return `${move.row + 1}-${move.col + 1}`;
}

function formatScore(value) {
  if (value === Infinity) return "+∞";
  if (value === -Infinity) return "-∞";
  if (value === null || value === undefined) return "?";

  return String(Math.round(value * 100) / 100);
}

function getTacticalMoveBonus(details) {
  if (!details) return 0;

  if (
    (details.opponentIgoAfter || 0) > 0 ||
    (details.openedOpponentIgoCount || 0) > 0 ||
    (details.unblockableOpponentIgoAfter || 0) > 0 ||
    (details.openedUnblockableOpponentIgoCount || 0) > 0
  ) {
    return LOSE_NEXT_TURN_SCORE;
  }

  let bonus = 0;

  bonus += (details.moveYugoScore || 0) * 5000;

  bonus += (details.openSpecialPairExtensionCount || 0) * 90000;
  bonus += (details.specialPairExtensionCount || 0) * 60000;
  bonus -= (details.gapSpecialThreeCount || 0) * 90000;
  bonus +=
    (details.openSpecialThreeCount || 0) *
    HEURISTIC_WEIGHTS.SELF_OPEN_SPECIAL_THREE;
  bonus +=
    (details.closedSpecialThreeCount || 0) *
    HEURISTIC_WEIGHTS.SELF_CLOSED_SPECIAL_THREE;
  bonus += (details.directYugoCount || 0) * 8000;
  bonus -= (details.gapYugoCount || 0) * 3000;

  bonus += (details.blockedYugoScore || 0) * 1000;
  bonus += (details.blockedIgoCount || 0) * 200000;
  bonus -= (details.openedOpponentIgoCount || 0) * 500000;
  bonus -= (details.unblockableOpponentIgoAfter || 0) * 500000;
  bonus -= (details.openedUnblockableOpponentIgoCount || 0) * 800000;

  return bonus;
}

function getOpenEndCountForSpecialLine(sourceBoard, row, col, dr, dc, player) {
  let leftCount = 0;
  let rightCount = 0;

  let currentRow = row - dr;
  let currentCol = col - dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isSpecialToken(sourceBoard[currentRow][currentCol], player)
  ) {
    leftCount++;
    currentRow -= dr;
    currentCol -= dc;
  }

  let leftOpen = 0;
  if (
    isInsideBoard(currentRow, currentCol) &&
    sourceBoard[currentRow][currentCol] === EMPTY
  ) {
    leftOpen = 1;
  }

  currentRow = row + dr;
  currentCol = col + dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isSpecialToken(sourceBoard[currentRow][currentCol], player)
  ) {
    rightCount++;
    currentRow += dr;
    currentCol += dc;
  }

  let rightOpen = 0;
  if (
    isInsideBoard(currentRow, currentCol) &&
    sourceBoard[currentRow][currentCol] === EMPTY
  ) {
    rightOpen = 1;
  }

  return leftOpen + rightOpen;
}

function evaluateOpponentSpecialBridgeThreat(sourceBoard, row, col, opponent) {
  const result = simulateMove(sourceBoard, row, col, opponent);

  if (!result.isValid) return null;

  // Kita fokus ke kasus di mana move lawan menghasilkan token special.
  if (!isSpecialToken(result.board[row][col], opponent)) {
    return null;
  }

  let bestThreat = null;

  for (const axis of AXES) {
    const leftCount = countSpecialInOneDirection(
      result.board,
      row,
      col,
      -axis.dr,
      -axis.dc,
      opponent,
    );

    const rightCount = countSpecialInOneDirection(
      result.board,
      row,
      col,
      axis.dr,
      axis.dc,
      opponent,
    );

    const total = 1 + leftCount + rightCount;

    // Yang kita cari minimal 3 special dalam satu garis
    if (total < 3) continue;

    const isBridge = leftCount > 0 && rightCount > 0;
    const openEnds = getOpenEndCountForSpecialLine(
      result.board,
      row,
      col,
      axis.dr,
      axis.dc,
      opponent,
    );

    const threatScore =
      total * 100000 + (isBridge ? 50000 : 0) + openEnds * 10000;

    if (!bestThreat || threatScore > bestThreat.threatScore) {
      bestThreat = {
        row,
        col,
        total,
        isBridge,
        openEnds,
        threatScore,
        axisName: axis.name,
      };
    }
  }

  return bestThreat;
}

function doesMoveAllowOpponentIgo(resultBoard, player) {
  const opponent = getOpponent(player);
  return countImmediateIgoMoves(resultBoard, opponent) > 0;
}

function getOpponentImmediateIgoThreats(sourceBoard, player) {
  const opponent = getOpponent(player);
  const threats = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const opponentResult = simulateMove(sourceBoard, row, col, opponent);

      if (!opponentResult.isValid) continue;

      if (opponentResult.winner === opponent) {
        const blockResult = simulateMove(sourceBoard, row, col, player);

        threats.push({
          row,
          col,
          canBlock: blockResult.isValid,
          blockMessage: blockResult.message || "",
        });
      }
    }
  }

  return threats;
}

function countUnblockableOpponentIgoThreats(sourceBoard, player) {
  const threats = getOpponentImmediateIgoThreats(sourceBoard, player);

  return threats.filter((threat) => !threat.canBlock).length;
}

function doesMoveCreateUnblockableOpponentIgo(
  sourceBoard,
  resultBoard,
  player,
) {
  const before = countUnblockableOpponentIgoThreats(sourceBoard, player);
  const after = countUnblockableOpponentIgoThreats(resultBoard, player);

  return after > before;
}

function getUrgentOpponentSpecialBridgeBlockMove(sourceBoard, player) {
  const opponent = getOpponent(player);

  let bestMove = null;
  let bestPriority = -Infinity;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const threat = evaluateOpponentSpecialBridgeThreat(
        sourceBoard,
        row,
        col,
        opponent,
      );

      if (!threat) continue;

      // AI mencoba blokir tepat di titik ancaman itu
      const blockResult = simulateMove(sourceBoard, row, col, player);

      if (!blockResult.isValid) continue;

      if (doesMoveAllowOpponentIgo(blockResult.board, player)) {
        continue;
      }

      const details = getMoveScoreDetails(
        sourceBoard,
        row,
        col,
        player,
        blockResult,
      );

      const priority = threat.threatScore + details.totalScore;

      if (priority > bestPriority) {
        bestPriority = priority;

        bestMove = {
          row,
          col,
          board: blockResult.board,
          winner: blockResult.winner,
          details,
          forcedReason: `BLOCK_OPPONENT_SPECIAL_BRIDGE (${threat.axisName})`,
        };
      }
    }
  }

  return bestMove;
}

function getImmediateIgoThreatCells(sourceBoard, attacker, defender) {
  const threats = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const attackResult = simulateMove(sourceBoard, row, col, attacker);

      if (!attackResult.isValid) continue;

      if (attackResult.winner === attacker) {
        const blockResult = simulateMove(sourceBoard, row, col, defender);

        threats.push({
          row,
          col,
          canBlock: blockResult.isValid,
        });
      }
    }
  }

  return threats;
}

function countUnblockableIgoThreatsForPlayer(sourceBoard, attacker, defender) {
  const threats = getImmediateIgoThreatCells(sourceBoard, attacker, defender);

  return threats.filter((threat) => !threat.canBlock).length;
}

function countMovesThatCreateUnblockableIgo(sourceBoard, attacker, defender) {
  let totalCount = 0;
  let totalScore = 0;
  const moves = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, attacker);

      if (!result.isValid) continue;

      const unblockableCount = countUnblockableIgoThreatsForPlayer(
        result.board,
        attacker,
        defender,
      );

      if (unblockableCount > 0) {
        totalCount++;
        totalScore += unblockableCount;

        moves.push({
          row,
          col,
          board: result.board,
          unblockableCount,
        });
      }
    }
  }

  return {
    totalCount,
    totalScore,
    moves,
  };
}

function countOpenSpecialThreeThreats(sourceBoard, player) {
  let totalCount = 0;
  let totalScore = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (sourceBoard[row][col] !== EMPTY) continue;

      const result = simulateMove(sourceBoard, row, col, player);

      if (!result.isValid) continue;

      const specialThree = getSpecialThreeLineDetails(
        result.board,
        row,
        col,
        player,
      );

      if (specialThree.openSpecialThreeCount > 0) {
        totalCount += specialThree.openSpecialThreeCount;
        totalScore += specialThree.openSpecialThreeCount * 3;
      }

      if (specialThree.closedSpecialThreeCount > 0) {
        totalCount += specialThree.closedSpecialThreeCount;
        totalScore += specialThree.closedSpecialThreeCount;
      }
    }
  }

  return {
    totalCount,
    totalScore,
  };
}

function getForcedBlockOpponentUnblockableSetupMove(sourceBoard, player) {
  const opponent = getOpponent(player);

  const opponentForcingMoves = countMovesThatCreateUnblockableIgo(
    sourceBoard,
    opponent,
    player,
  );

  if (opponentForcingMoves.totalCount === 0) {
    return null;
  }

  let bestMove = null;
  let bestPriority = -Infinity;

  for (const threatMove of opponentForcingMoves.moves) {
    const blockResult = simulateMove(
      sourceBoard,
      threatMove.row,
      threatMove.col,
      player,
    );

    if (!blockResult.isValid) continue;

    const details = getMoveScoreDetails(
      sourceBoard,
      threatMove.row,
      threatMove.col,
      player,
      blockResult,
    );

    const priority =
      8000000 + threatMove.unblockableCount * 500000 + details.totalScore;

    if (priority > bestPriority) {
      bestPriority = priority;

      bestMove = {
        row: threatMove.row,
        col: threatMove.col,
        board: blockResult.board,
        winner: blockResult.winner,
        details,
        priority,
        forcedReason: `BLOCK_OPPONENT_FORCING_UNBLOCKABLE_IGO (${threatMove.unblockableCount})`,
      };
    }
  }

  return bestMove;
}

function getSpecialThreeLineDetails(sourceBoard, row, col, player) {
  let openSpecialThreeCount = 0;
  let closedSpecialThreeCount = 0;
  let bestSpecialThreeScore = 0;

  const token = sourceBoard[row][col];

  // Hanya dihitung kalau move tersebut menghasilkan special token: X/T/S.
  if (!isSpecialToken(token, player)) {
    return {
      openSpecialThreeCount,
      closedSpecialThreeCount,
      bestSpecialThreeScore,
    };
  }

  for (const axis of AXES) {
    const backwardCount = countSpecialInOneDirection(
      sourceBoard,
      row,
      col,
      -axis.dr,
      -axis.dc,
      player,
    );

    const forwardCount = countSpecialInOneDirection(
      sourceBoard,
      row,
      col,
      axis.dr,
      axis.dc,
      player,
    );

    const totalSpecial = 1 + backwardCount + forwardCount;

    // Fokus ke 3 special token sejajar.
    if (totalSpecial !== 3) continue;

    const openEnds = countOpenEndsForSpecialLine(
      sourceBoard,
      row,
      col,
      axis.dr,
      axis.dc,
      player,
    );

    if (openEnds === 2) {
      openSpecialThreeCount++;
      bestSpecialThreeScore = Math.max(bestSpecialThreeScore, 3);
    } else if (openEnds === 1) {
      closedSpecialThreeCount++;
      bestSpecialThreeScore = Math.max(bestSpecialThreeScore, 1);
    }
  }

  return {
    openSpecialThreeCount,
    closedSpecialThreeCount,
    bestSpecialThreeScore,
  };
}

function getSpecialPairExtensionDetails(sourceBoard, row, col, player) {
  let specialPairExtensionCount = 0;
  let openSpecialPairExtensionCount = 0;

  if (!isPlayerToken(sourceBoard[row][col], player)) {
    return {
      specialPairExtensionCount,
      openSpecialPairExtensionCount,
    };
  }

  for (const axis of AXES) {
    const forwardSpecialCount = countSpecialInOneDirection(
      sourceBoard,
      row,
      col,
      axis.dr,
      axis.dc,
      player,
    );

    const backwardSpecialCount = countSpecialInOneDirection(
      sourceBoard,
      row,
      col,
      -axis.dr,
      -axis.dc,
      player,
    );

    // Pola: B XB XB
    if (forwardSpecialCount >= 2) {
      specialPairExtensionCount++;

      const beforePlacedRow = row - axis.dr;
      const beforePlacedCol = col - axis.dc;

      const afterRunRow = row + axis.dr * (forwardSpecialCount + 1);
      const afterRunCol = col + axis.dc * (forwardSpecialCount + 1);

      const leftOpen =
        isInsideBoard(beforePlacedRow, beforePlacedCol) &&
        sourceBoard[beforePlacedRow][beforePlacedCol] === EMPTY;

      const rightOpen =
        isInsideBoard(afterRunRow, afterRunCol) &&
        sourceBoard[afterRunRow][afterRunCol] === EMPTY;

      if (leftOpen && rightOpen) {
        openSpecialPairExtensionCount++;
      }
    }

    // Pola: XB XB B
    if (backwardSpecialCount >= 2) {
      specialPairExtensionCount++;

      const beforeRunRow = row - axis.dr * (backwardSpecialCount + 1);
      const beforeRunCol = col - axis.dc * (backwardSpecialCount + 1);

      const afterPlacedRow = row + axis.dr;
      const afterPlacedCol = col + axis.dc;

      const leftOpen =
        isInsideBoard(beforeRunRow, beforeRunCol) &&
        sourceBoard[beforeRunRow][beforeRunCol] === EMPTY;

      const rightOpen =
        isInsideBoard(afterPlacedRow, afterPlacedCol) &&
        sourceBoard[afterPlacedRow][afterPlacedCol] === EMPTY;

      if (leftOpen && rightOpen) {
        openSpecialPairExtensionCount++;
      }
    }
  }

  return {
    specialPairExtensionCount,
    openSpecialPairExtensionCount,
  };
}

function getGapSpecialThreeDetails(sourceBoard, row, col, player) {
  let gapSpecialThreeCount = 0;

  for (const axis of AXES) {
    for (let offset = -3; offset <= 0; offset++) {
      const cells = [];

      for (let i = 0; i < 4; i++) {
        const checkRow = row + axis.dr * (offset + i);
        const checkCol = col + axis.dc * (offset + i);

        if (!isInsideBoard(checkRow, checkCol)) {
          cells.length = 0;
          break;
        }

        cells.push({
          row: checkRow,
          col: checkCol,
        });
      }

      if (cells.length !== 4) continue;

      const tokens = cells.map((cell) => sourceBoard[cell.row][cell.col]);

      const specialPositions = [];

      for (let i = 0; i < tokens.length; i++) {
        if (isSpecialToken(tokens[i], player)) {
          specialPositions.push(i);
        } else if (tokens[i] !== EMPTY) {
          specialPositions.length = 0;
          break;
        }
      }

      if (specialPositions.length !== 3) continue;

      const hasConsecutiveThree =
        (specialPositions.includes(0) &&
          specialPositions.includes(1) &&
          specialPositions.includes(2)) ||
        (specialPositions.includes(1) &&
          specialPositions.includes(2) &&
          specialPositions.includes(3));

      // Kalau 3 special tidak rapat, berarti bentuknya seperti:
      // XB XB _ XB atau XB _ XB XB
      if (!hasConsecutiveThree) {
        gapSpecialThreeCount++;
      }
    }
  }

  return {
    gapSpecialThreeCount,
  };
}

function countOpenEndsForSpecialLine(sourceBoard, row, col, dr, dc, player) {
  let openEnds = 0;

  let currentRow = row - dr;
  let currentCol = col - dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isSpecialToken(sourceBoard[currentRow][currentCol], player)
  ) {
    currentRow -= dr;
    currentCol -= dc;
  }

  if (
    isInsideBoard(currentRow, currentCol) &&
    sourceBoard[currentRow][currentCol] === EMPTY
  ) {
    openEnds++;
  }

  currentRow = row + dr;
  currentCol = col + dc;

  while (
    isInsideBoard(currentRow, currentCol) &&
    isSpecialToken(sourceBoard[currentRow][currentCol], player)
  ) {
    currentRow += dr;
    currentCol += dc;
  }

  if (
    isInsideBoard(currentRow, currentCol) &&
    sourceBoard[currentRow][currentCol] === EMPTY
  ) {
    openEnds++;
  }

  return openEnds;
}

// ===============================
// MINIMAX TRACE CANVAS
// ===============================
function initMinimaxCanvas() {
  if (!TRACE_CANVAS_ENABLED) return;

  TRACE_CANVAS = document.getElementById("minimax_tree_canvas");

  if (!TRACE_CANVAS) {
    alert("Canvas minimax_tree_canvas tidak ditemukan di HTML.");
    return;
  }

  TRACE_CANVAS.width = 2000;
  TRACE_CANVAS.height = 1200;

  TRACE_CTX = TRACE_CANVAS.getContext("2d");

  drawEmptyTraceCanvas();
}

function drawEmptyTraceCanvas() {
  if (!TRACE_CANVAS || !TRACE_CTX) return;

  TRACE_CTX.clearRect(0, 0, TRACE_CANVAS.width, TRACE_CANVAS.height);

  TRACE_CTX.fillStyle = "#ffffff";
  TRACE_CTX.fillRect(0, 0, TRACE_CANVAS.width, TRACE_CANVAS.height);

  TRACE_CTX.font = "18px Arial";
  TRACE_CTX.textAlign = "center";
  TRACE_CTX.textBaseline = "middle";
  TRACE_CTX.fillStyle = "#333";
  TRACE_CTX.fillText(
    "Minimax tree akan muncul setelah AI bergerak.",
    TRACE_CANVAS.width / 2,
    90,
  );
}

function drawMinimaxTraceTree(root) {
  if (!TRACE_CANVAS_ENABLED) return;

  if (!TRACE_CANVAS || !TRACE_CTX) {
    initMinimaxCanvas();
  }

  if (!TRACE_CANVAS || !TRACE_CTX) return;

  const drawableRoot = cloneTraceForDrawing(root, 0);

  calculateTraceTreeWidth(drawableRoot);

  const treeWidth = drawableRoot.subtreeWidth;
  const treeHeight = calculateTraceTreeHeight(drawableRoot);

  TRACE_CANVAS.width = Math.min(
    TRACE_MAX_CANVAS_WIDTH,
    Math.max(1800, treeWidth + 240),
  );

  TRACE_CANVAS.height = Math.min(
    TRACE_MAX_CANVAS_HEIGHT,
    Math.max(900, treeHeight + 260),
  );

  TRACE_CTX.clearRect(0, 0, TRACE_CANVAS.width, TRACE_CANVAS.height);

  TRACE_CTX.fillStyle = "#ffffff";
  TRACE_CTX.fillRect(0, 0, TRACE_CANVAS.width, TRACE_CANVAS.height);

  TRACE_CTX.font = "11px Arial";
  TRACE_CTX.textAlign = "center";
  TRACE_CTX.textBaseline = "middle";

  assignTraceNodePositions(drawableRoot, TRACE_CANVAS.width / 2, 110);

  drawTraceConnections(drawableRoot);
  drawTraceNodes(drawableRoot);
  drawTraceHeader(root);
}

function cloneTraceForDrawing(node, level) {
  const canDrawChildren = level < TRACE_MAX_DRAW_DEPTH;

  const children = canDrawChildren
    ? node.children
        .slice(0, TRACE_MAX_DRAW_CHILDREN)
        .map((child) => cloneTraceForDrawing(child, level + 1))
    : [];

  return {
    ...node,
    children,
    drawX: 0,
    drawY: 0,
    subtreeWidth: 0,
  };
}

function calculateTraceTreeWidth(node) {
  if (node.children.length === 0) {
    node.subtreeWidth = TRACE_NODE_WIDTH + TRACE_HORIZONTAL_GAP;
    return node.subtreeWidth;
  }

  let totalWidth = 0;

  for (const child of node.children) {
    totalWidth += calculateTraceTreeWidth(child);
  }

  node.subtreeWidth = Math.max(
    TRACE_NODE_WIDTH + TRACE_HORIZONTAL_GAP,
    totalWidth,
  );

  return node.subtreeWidth;
}

function calculateTraceTreeHeight(node) {
  if (node.children.length === 0) {
    return TRACE_NODE_HEIGHT;
  }

  const childHeights = node.children.map((child) =>
    calculateTraceTreeHeight(child),
  );

  return TRACE_NODE_HEIGHT + TRACE_VERTICAL_GAP + Math.max(...childHeights);
}

function assignTraceNodePositions(node, centerX, y) {
  node.drawX = centerX;
  node.drawY = y;

  if (node.children.length === 0) return;

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
    TRACE_CTX.lineWidth = child.pruned ? 3 : 1;
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

  drawRoundedRect(TRACE_CTX, x - w / 2, y - h / 2, w, h, 10);

  TRACE_CTX.fillStyle = getTraceNodeColor(node);
  TRACE_CTX.fill();

  TRACE_CTX.strokeStyle = node.pruned ? "#cc0000" : "#333";
  TRACE_CTX.lineWidth = node.pruned ? 3 : 1;
  TRACE_CTX.stroke();

  TRACE_CTX.fillStyle = "#111";
  TRACE_CTX.font = "11px Arial";

  const lines = [
    `${node.nodeType} | ${node.player || "-"}`,
    `move: ${formatMove(node.move)}`,
    `score: ${formatScore(node.score)}`,
    `α ${formatScore(node.alphaStart)} → ${formatScore(node.alphaEnd)}`,
    `β ${formatScore(node.betaStart)} → ${formatScore(node.betaEnd)}`,
  ];

  if (node.details) {
    lines.push(
      `Yugo: ${node.details.moveYugoScore} | Future: ${node.details.futureYugoScore}`,
    );
    lines.push(
      `Block Y: ${node.details.blockedYugoScore} | Block I: ${node.details.blockedIgoCount}`,
    );
    lines.push(
      `Invalid: ${node.details.ownInvalidMoves} | Opp Invalid: ${node.details.opponentInvalidMoves}`,
    );
    lines.push(`MoveScore: ${formatScore(node.details.totalScore)}`);
  }

  if (node.reason) {
    lines.push(node.reason);
  }

  lines.forEach((line, index) => {
    TRACE_CTX.fillText(line, x, y - 63 + index * 14);
  });

  if (node.pruned) {
    TRACE_CTX.fillStyle = "#cc0000";
    TRACE_CTX.fillText("PRUNED", x, y + 72);
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawTraceHeader(root) {
  TRACE_CTX.fillStyle = "#111";
  TRACE_CTX.font = "16px Arial";
  TRACE_CTX.textAlign = "left";
  TRACE_CTX.textBaseline = "top";

  const bestMove = root.bestMove ? formatMove(root.bestMove) : "-";

  TRACE_CTX.fillText(`AI: ${AI_PLAYER}`, 20, 20);
  TRACE_CTX.fillText(`Human: ${HUMAN_PLAYER}`, 20, 45);
  TRACE_CTX.fillText(`Best Move: ${bestMove}`, 20, 70);
  TRACE_CTX.fillText(`Best Score: ${formatScore(root.score)}`, 20, 95);
  TRACE_CTX.fillText(`Depth: ${MAX_DEPTH}`, 20, 120);
  TRACE_CTX.fillText(`TOP_K: ${TOP_K}`, 20, 145);
  TRACE_CTX.fillText(
    `Draw children per node: ${TRACE_MAX_DRAW_CHILDREN}`,
    20,
    170,
  );
}

function getTraceNodeColor(node) {
  if (node.pruned) return "#ffe1e1";
  if (node.nodeType === "ROOT") return "#eeeeee";
  if (node.nodeType === "AI MOVE") return "#dff7df";
  if (node.nodeType === "MAX") return "#e3f2ff";
  if (node.nodeType === "MIN") return "#fff0cc";
  if (node.nodeType === "FORCED") return "#c8f7c5";

  return "#ffffff";
}

window.resetBoard = resetBoard;
window.makeAIMove = makeAIMove;

document.addEventListener("DOMContentLoaded", initGame);
