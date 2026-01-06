const ROWS = 6;
const COLS = 7;

const createBoard = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

const checkWin = (board, row, col, player) => {
    const directions = [
        [[0, 1], [0, -1]], // Horizontal
        [[1, 0], [-1, 0]], // Vertical
        [[1, 1], [-1, -1]], // Diagonal \
        [[1, -1], [-1, 1]]  // Diagonal /
    ];

    for (let dir of directions) {
        let count = 1;
        for (let [dr, dc] of dir) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
                count++;
                r += dr; c += dc;
            }
        }
        if (count >= 4) return true;
    }
    return false;
};

// Strategic Bot: 1. Win if possible, 2. Block if player about to win, 3. Take center
const getBotMove = (board) => {
    const validCols = [];
    for (let c = 0; c < COLS; c++) if (board[0][c] === 0) validCols.push(c);

    // 1. Can Bot win?
    for (let col of validCols) {
        let row = getLowestRow(board, col);
        if (checkWin(board, row, col, 2)) return col;
    }
    // 2. Must Bot block player (1)?
    for (let col of validCols) {
        let row = getLowestRow(board, col);
        if (checkWin(board, row, col, 1)) return col;
    }
    // 3. Default to center-weighted random
    return validCols[Math.floor(validCols.length / 2)];
};

const getLowestRow = (board, col) => {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === 0) return r;
    }
    return -1;
};

module.exports = { createBoard, checkWin, getBotMove, getLowestRow, ROWS, COLS };