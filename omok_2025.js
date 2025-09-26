// Omok2025 스타일 오목 AI 알고리즘
// Minimax + Alpha-Beta Pruning + Pattern Recognition

class Omok2025 {
    constructor(boardSize = 15) {
        this.size = boardSize;
        this.TT = new Map(); // Transposition Table
        this.open4Patterns = ["OOOO_", "_OOOO", "OO_OO", "O_OOO", "OOO_O"];
        this.open3Patterns = ["_OOO_", "OO_O_", "_OO_O", "O_OO_", "_O_OO"];
    }

    // 보드 상태 해시
    boardHash(board) {
        return board.flat().join('');
    }

    // 평가 함수
    evaluate(board, player) {
        let score = 0;
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] !== player) continue;

                for (const [dx, dy] of dirs) {
                    let line = "";
                    for (let k = -2; k <= 4; k++) {
                        let nx = x + k*dx, ny = y + k*dy;
                        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) {
                            line += "X";
                        } else if (board[ny][nx] === player) {
                            line += "O";
                        } else if (board[ny][nx] === 0) {
                            line += "_";
                        } else {
                            line += "X";
                        }
                    }

                    // 점수 부여
                    if (line.includes("OOOOO")) {
                        score += 900001; // 즉시 승리
                    }
                    else if (this.open4Patterns.some(p => line.includes(p))) {
                        score += (player === 2 ? 9001 : 90001); // 열린4
                    }
                    else if (this.open3Patterns.some(p => line.includes(p))) {
                        score += (player === 2 ? 91 : 901); // 열린3
                    }
                    else {
                        // count+openEnds 방식으로 닫힌3, 2목 처리
                        let count = 1, openEnds = 0;
                        let nx = x + dx, ny = y + dy;
                        while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                            count++; nx += dx; ny += dy;
                        }
                        if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === 0) openEnds++;
                        nx = x - dx; ny = y - dy;
                        while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                            count++; nx -= dx; ny -= dy;
                        }
                        if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === 0) openEnds++;

                        // 대각선 보너스 (dx와 dy가 모두 0이 아닌 경우)
                        const isDiagonal = (dx !== 0 && dy !== 0);
                        const diagonalBonus = isDiagonal ? 1 : 0;

                        if (count === 3 && openEnds === 1) {
                            score += (player === 2 ? 11 : 15) + diagonalBonus; // 닫힌3
                        }
                        else if (count === 2 && openEnds === 2) {
                            score += (player === 2 ? 3 : 5) + diagonalBonus; // 열린2
                        }
                        else if (count === 2 && openEnds === 1) {
                            score += (player === 2 ? 1 : 2) + diagonalBonus; // 닫힌2
                        }
                    }
                }
            }
        }
        return score;
    }

    evaluateBoard(board, player = 2) {
        const opponent = 3 - player;
        return this.evaluate(board, player) - this.evaluate(board, opponent);
    }

    // Minimax with Alpha-Beta Pruning
    minimax(board, depth, alpha, beta, maximizingPlayer, aiPlayer = 2) {
        const hash = this.boardHash(board) + depth + maximizingPlayer;
        if (this.TT.has(hash)) return this.TT.get(hash);

        if (depth === 0) {
            const val = this.evaluateBoard(board, aiPlayer);
            this.TT.set(hash, val);
            return val;
        }

        let bestScore = maximizingPlayer ? -Infinity : Infinity;
        const moves = this.getCandidateMoves(board);

        for (const [x, y] of moves) {
            board[y][x] = maximizingPlayer ? aiPlayer : (3 - aiPlayer);
            const score = this.minimax(board, depth - 1, alpha, beta, !maximizingPlayer, aiPlayer);
            board[y][x] = 0;

            if (maximizingPlayer) {
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }
            if (beta <= alpha) break;
        }

        this.TT.set(hash, bestScore);
        return bestScore;
    }

    // 후보수 찾기
    getCandidateMoves(board) {
        let moves = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] === 0 && this.hasNeighbor(board, x, y)) {
                    moves.push([x, y]);
                }
            }
        }
        return moves;
    }

    hasNeighbor(board, x, y) {
        const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] !== 0) return true;
        }
        return false;
    }

    // 승리 체크
    checkWin(board, x, y, player) {
        const directions = [[1,0],[0,1],[1,1],[1,-1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            let nx = x + dx, ny = y + dy;
            while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                count++; nx += dx; ny += dy;
            }
            nx = x - dx; ny = y - dy;
            while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                count++; nx -= dx; ny -= dy;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    // 즉시 이길 수 있는 수 찾기
    findWinningMove(board, player) {
        const moves = this.getCandidateMoves(board);

        for (const [x, y] of moves) {
            board[y][x] = player; // AI가 여기 둔다면
            if (this.checkWin(board, x, y, player)) {
                board[y][x] = 0;
                return { x, y };
            }
            board[y][x] = 0;
        }
        return null;
    }

    // 상대방을 막아야 하는 수 찾기 (개선판: 다중 위협 동시 방어)
    findDefenseMove(board, player) {
        const moves = this.getCandidateMoves(board);
        const opponent = 3 - player;

        // 5목 차단 (최우선 - 즉시 반환)
        for (const [x, y] of moves) {
            board[y][x] = opponent; // 상대방이 여기 둔다면
            if (this.checkWin(board, x, y, opponent)) {
                board[y][x] = 0;
                return { x, y }; // 5목은 반드시 즉시 막아야 함
            }
            board[y][x] = 0;
        }

        // 오픈4 차단 위치 수집
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];
        const open4Blocks = new Set();

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] !== opponent) continue;

                for (const [dx, dy] of dirs) {
                    let line = "";
                    for (let k = -4; k <= 4; k++) {
                        let nx = x + k*dx, ny = y + k*dy;
                        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) {
                            line += "X";
                        } else if (board[ny][nx] === opponent) {
                            line += "O";
                        } else if (board[ny][nx] === 0) {
                            line += "_";
                        } else {
                            line += "X";
                        }
                    }

                    for (let pattern of this.open4Patterns) {
                        const idx = line.indexOf(pattern);
                        if (idx !== -1) {
                            for (let i = 0; i < pattern.length; i++) {
                                if (pattern[i] === '_') {
                                    const k = idx + i - 4;
                                    const blockX = x + k * dx;
                                    const blockY = y + k * dy;
                                    if (blockX >= 0 && blockY >= 0 && blockX < this.size && blockY < this.size && board[blockY][blockX] === 0) {
                                        open4Blocks.add(`${blockX},${blockY}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 오픈4가 있다면 모든 가능한 방어 위치 평가
        if (open4Blocks.size > 0) {
            let bestMove = null;
            let bestScore = -Infinity;

            for (const posStr of open4Blocks) {
                const [x, y] = posStr.split(',').map(Number);
                board[y][x] = player;

                // 이 위치가 다른 위협도 막는지 평가
                const defenseScore = this.evaluateDefensePosition(board, x, y, player, opponent);
                const positionScore = this.evaluateBoard(board, player);
                const totalScore = defenseScore * 2 + positionScore; // 방어 점수에 가중치

                board[y][x] = 0;

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMove = { x, y };
                }
            }

            if (bestMove) return bestMove;
        }

        // 열린 3목 차단 위치 수집 및 평가
        const open3Blocks = [];
        const open3Patterns = ["_OOO_"];

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] !== opponent) continue;

                for (const [dx, dy] of dirs) {
                    let line = "";
                    for (let k = -3; k <= 3; k++) {
                        let nx = x + k*dx, ny = y + k*dy;
                        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) {
                            line += "X";
                        } else if (board[ny][nx] === opponent) {
                            line += "O";
                        } else if (board[ny][nx] === 0) {
                            line += "_";
                        } else {
                            line += "X";
                        }
                    }

                    for (let pattern of open3Patterns) {
                        const idx = line.indexOf(pattern);
                        if (idx !== -1) {
                            for (let i = 0; i < pattern.length; i++) {
                                if (pattern[i] === '_') {
                                    const k = idx + i - 3;
                                    const blockX = x + k * dx;
                                    const blockY = y + k * dy;
                                    if (blockX >= 0 && blockY >= 0 && blockX < this.size && blockY < this.size && board[blockY][blockX] === 0) {
                                        open3Blocks.push({ x: blockX, y: blockY });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 열린 3목 방어 위치 중 최적 선택
        if (open3Blocks.length > 0) {
            let bestMove = null;
            let bestScore = -Infinity;

            // 중복 제거
            const uniqueBlocks = new Map();
            for (const block of open3Blocks) {
                const key = `${block.x},${block.y}`;
                if (!uniqueBlocks.has(key)) {
                    uniqueBlocks.set(key, block);
                }
            }

            for (const block of uniqueBlocks.values()) {
                board[block.y][block.x] = player;

                // 이 위치가 다른 위협도 막는지 평가
                const defenseScore = this.evaluateDefensePosition(board, block.x, block.y, player, opponent);
                const positionScore = this.evaluateBoard(board, player);
                const totalScore = defenseScore * 2 + positionScore; // 방어 점수에 가중치

                board[block.y][block.x] = 0;

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMove = block;
                }
            }

            if (bestMove) return bestMove;
        }

        return null;
    }

    // 방어 위치 평가 함수
    evaluateDefensePosition(board, x, y, _player, opponent) {
        let score = 0;
        const dirs = [[1,0],[0,1],[1,1],[1,-1]];

        // 해당 위치가 얼마나 많은 상대 패턴을 막는지 확인
        for (const [dx, dy] of dirs) {
            let opponentCount = 0;
            let emptyCount = 0;

            // 양방향 확인
            for (let k = 1; k <= 4; k++) {
                const nx = x + k * dx;
                const ny = y + k * dy;
                if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size) {
                    if (board[ny][nx] === opponent) opponentCount++;
                    else if (board[ny][nx] === 0) emptyCount++;
                    else break;
                } else break;
            }

            for (let k = 1; k <= 4; k++) {
                const nx = x - k * dx;
                const ny = y - k * dy;
                if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size) {
                    if (board[ny][nx] === opponent) opponentCount++;
                    else if (board[ny][nx] === 0) emptyCount++;
                    else break;
                } else break;
            }

            // 상대 돌이 많을수록 더 위험한 위치
            if (opponentCount >= 3) score += 100;
            else if (opponentCount >= 2 && emptyCount >= 2) score += 50;
            else if (opponentCount >= 1 && emptyCount >= 3) score += 20;
        }

        // 중앙 근처 선호
        const centerDist = Math.abs(x - 7) + Math.abs(y - 7);
        score += (14 - centerDist);

        return score;
    }

    // 메인 AI 착수 함수
    getMove(board, playerNumber = 2) {
        // 첫 수는 중앙에
        const center = Math.floor(this.size / 2);
        let isEmpty = true;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] !== 0) {
                    isEmpty = false;
                    break;
                }
            }
            if (!isEmpty) break;
        }
        if (isEmpty) {
            return { x: center, y: center };
        }

        // 1. 즉시 이길 수 있는지 체크
        const winningMove = this.findWinningMove(board, playerNumber);
        if (winningMove) {
            return winningMove;
        }

        // 2. 상대방 막아야 하는지 체크
        const defenseMove = this.findDefenseMove(board, playerNumber);
        if (defenseMove) {
            return defenseMove;
        }

        // 3. Minimax 탐색
        let bestScore = -Infinity;
        let bestMove = null;
        const moves = this.getCandidateMoves(board);

        // 평가 후 정렬 → 상위 12개만 사용
        const scoredMoves = moves.map(([x, y]) => {
            board[y][x] = playerNumber;
            const score = this.evaluateBoard(board, playerNumber);
            board[y][x] = 0;
            return { x, y, score };
        }).sort((a, b) => b.score - a.score).slice(0, 12);

        for (const { x, y } of scoredMoves) {
            board[y][x] = playerNumber;
            const score = this.minimax(board, 2, -Infinity, Infinity, false, playerNumber);
            board[y][x] = 0;
            if (score > bestScore) {
                bestScore = score;
                bestMove = [x, y];
            }
        }

        if (bestMove) {
            const [bx, by] = bestMove;
            return { x: bx, y: by };
        }

        return null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Omok2025;
}