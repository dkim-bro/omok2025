// Counter - Advanced Gomoku AI Algorithm by Claude
// Features: Threat-Space Search, VCF/VCT, Advanced Pattern Recognition,
// Zobrist Hashing, Iterative Deepening, Killer Moves

class OmokCounter {
    constructor(boardSize = 15) {
        this.size = boardSize;
        this.zobristTable = this.initZobrist();
        this.transpositionTable = new Map();
        this.killerMoves = [];
        this.historyTable = {};
        this.nodeCount = 0;

        // Advanced pattern definitions with threat levels
        this.patterns = {
            five: { pattern: "OOOOO", score: 10000000, threat: 5 },

            // Live Four (unstoppable)
            liveFour: { patterns: ["_OOOO_"], score: 1000000, threat: 4 },

            // Dead Four (blockable but urgent)
            deadFour: { patterns: ["XOOOO_", "_OOOOX", "OO_OO", "O_OOO", "OOO_O"], score: 100000, threat: 3 },

            // Live Three (creates live four next)
            liveThree: { patterns: ["__OOO__", "_O_OO_", "_OO_O_"], score: 10000, threat: 2 },

            // Dead Three
            deadThree: { patterns: ["XOOO__", "__OOOX", "XOO_O_", "_O_OOX", "XO_OO_", "_OO_OX"], score: 1000, threat: 1 },

            // Live Two
            liveTwo: { patterns: ["___OO___", "__O_O__", "__OO___", "___OO__"], score: 100, threat: 0 },

            // Dead Two
            deadTwo: { patterns: ["XOO___", "___OOX", "XO_O__", "__O_OX"], score: 10, threat: 0 }
        };

        // Position weights (center is more valuable)
        this.positionWeights = this.initPositionWeights();
    }

    initZobrist() {
        const table = [];
        for (let i = 0; i < this.size; i++) {
            table[i] = [];
            for (let j = 0; j < this.size; j++) {
                table[i][j] = [];
                for (let k = 0; k < 3; k++) {
                    table[i][j][k] = Math.floor(Math.random() * 2147483647);
                }
            }
        }
        return table;
    }

    initPositionWeights() {
        const weights = [];
        const center = Math.floor(this.size / 2);
        for (let y = 0; y < this.size; y++) {
            weights[y] = [];
            for (let x = 0; x < this.size; x++) {
                const distFromCenter = Math.max(Math.abs(x - center), Math.abs(y - center));
                weights[y][x] = this.size - distFromCenter;
            }
        }
        return weights;
    }

    getZobristHash(board) {
        let hash = 0;
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] !== 0) {
                    hash ^= this.zobristTable[y][x][board[y][x]];
                }
            }
        }
        return hash;
    }

    // Advanced pattern matching with direction awareness
    evaluatePosition(board, player) {
        let score = 0;
        let threats = [];
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] === player) {
                    score += this.positionWeights[y][x] * 5;

                    for (const [dx, dy] of dirs) {
                        const lineInfo = this.analyzeLine(board, x, y, dx, dy, player);
                        score += lineInfo.score;
                        if (lineInfo.threat > 0) {
                            threats.push({
                                x: lineInfo.criticalPoint?.x,
                                y: lineInfo.criticalPoint?.y,
                                level: lineInfo.threat,
                                player: player
                            });
                        }
                    }
                }
            }
        }

        return { score, threats };
    }

    analyzeLine(board, x, y, dx, dy, player) {
        let line = "";
        let positions = [];
        const range = 5;

        for (let k = -range; k <= range; k++) {
            const nx = x + k * dx;
            const ny = y + k * dy;
            positions.push({x: nx, y: ny});

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

        // Check for patterns and identify critical points
        let bestPattern = null;
        let criticalPoint = null;
        let maxScore = 0;
        let maxThreat = 0;

        // Check five
        if (line.includes("OOOOO")) {
            return { score: this.patterns.five.score, threat: this.patterns.five.threat, criticalPoint: null };
        }

        // Check live four
        for (let pattern of this.patterns.liveFour.patterns) {
            const idx = line.indexOf(pattern);
            if (idx !== -1) {
                const emptyIdx = pattern.indexOf('_');
                criticalPoint = positions[idx + emptyIdx];
                return {
                    score: this.patterns.liveFour.score,
                    threat: this.patterns.liveFour.threat,
                    criticalPoint
                };
            }
        }

        // Check dead four
        for (let pattern of this.patterns.deadFour.patterns) {
            const idx = line.indexOf(pattern);
            if (idx !== -1) {
                const emptyIdx = pattern.indexOf('_');
                if (emptyIdx !== -1) {
                    criticalPoint = positions[idx + emptyIdx];
                    maxScore = Math.max(maxScore, this.patterns.deadFour.score);
                    maxThreat = Math.max(maxThreat, this.patterns.deadFour.threat);
                }
            }
        }

        // Check live three
        for (let pattern of this.patterns.liveThree.patterns) {
            const idx = line.indexOf(pattern);
            if (idx !== -1) {
                maxScore = Math.max(maxScore, this.patterns.liveThree.score);
                maxThreat = Math.max(maxThreat, this.patterns.liveThree.threat);
            }
        }

        // Additional scoring for consecutive stones
        let consecutive = 0;
        let openEnds = 0;
        let startIdx = range;

        // Count forward
        for (let k = 0; k <= range; k++) {
            if (line[range + k] === 'O') consecutive++;
            else {
                if (line[range + k] === '_') openEnds++;
                break;
            }
        }

        // Count backward
        for (let k = 1; k <= range; k++) {
            if (line[range - k] === 'O') consecutive++;
            else {
                if (line[range - k] === '_') openEnds++;
                break;
            }
        }

        // Bonus for consecutive stones with open ends
        if (openEnds === 2) {
            maxScore += consecutive * 50;
        } else if (openEnds === 1) {
            maxScore += consecutive * 10;
        }

        return { score: maxScore, threat: maxThreat, criticalPoint };
    }

    // VCF (Victory by Continuous Four) search
    searchVCF(board, player, depth = 10) {
        if (depth === 0) return null;

        const moves = this.getCandidateMoves(board);

        for (const [x, y] of moves) {
            // 쌍삼 체크
            if (this.checkDoubleThree(board, x, y, player)) {
                continue;
            }

            board[y][x] = player;

            // Check if this creates a four
            if (this.hasFour(board, x, y, player)) {
                // Opponent must block
                const forcedDefenses = this.findForcedDefenses(board, player);

                if (forcedDefenses.length === 1) {
                    // Only one defense, opponent is forced
                    const [dx, dy] = forcedDefenses[0];
                    board[dy][dx] = 3 - player;

                    // Continue searching
                    const vcf = this.searchVCF(board, player, depth - 1);
                    board[dy][dx] = 0;

                    if (vcf !== null || this.checkWin(board, x, y, player)) {
                        board[y][x] = 0;
                        return { x, y };
                    }
                } else if (forcedDefenses.length === 0) {
                    // No defense possible, winning move
                    board[y][x] = 0;
                    return { x, y };
                }
            }

            board[y][x] = 0;
        }

        return null;
    }

    hasFour(board, x, y, player) {
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];

        for (const [dx, dy] of dirs) {
            let count = 1;

            // Count forward
            let nx = x + dx, ny = y + dy;
            while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                count++;
                nx += dx;
                ny += dy;
            }

            // Count backward
            nx = x - dx;
            ny = y - dy;
            while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                count++;
                nx -= dx;
                ny -= dy;
            }

            if (count === 4) return true;
        }

        return false;
    }

    findForcedDefenses(board, attacker) {
        const defenses = [];
        const moves = this.getCandidateMoves(board);

        for (const [x, y] of moves) {
            board[y][x] = attacker;
            if (this.checkWin(board, x, y, attacker)) {
                defenses.push([x, y]);
            }
            board[y][x] = 0;
        }

        return defenses;
    }

    // Enhanced minimax with threat-based pruning
    minimaxWithThreats(board, depth, alpha, beta, maximizingPlayer, lastMove = null, aiPlayer = 2) {
        this.nodeCount++;

        const hash = this.getZobristHash(board);
        const ttEntry = this.transpositionTable.get(hash);
        if (ttEntry && ttEntry.depth >= depth) {
            return ttEntry.value;
        }

        // Terminal node checks
        if (lastMove && this.checkWin(board, lastMove.x, lastMove.y, lastMove.player)) {
            const value = maximizingPlayer ? -10000000 : 10000000;
            this.transpositionTable.set(hash, { value, depth });
            return value;
        }

        if (depth === 0) {
            const aiEval = this.evaluatePosition(board, aiPlayer || 2);
            const oppEval = this.evaluatePosition(board, 3 - (aiPlayer || 2));
            const value = aiEval.score - oppEval.score;
            this.transpositionTable.set(hash, { value, depth });
            return value;
        }

        // Check for immediate threats
        const opponentEval = this.evaluatePosition(board, maximizingPlayer ? (3 - (aiPlayer || 2)) : (aiPlayer || 2));

        // If opponent has live four, must defend
        const urgentThreats = opponentEval.threats.filter(t => t.level >= 3);
        let moves;

        if (urgentThreats.length > 0) {
            // Only consider defensive moves
            moves = urgentThreats.map(t => [t.x, t.y]).filter(([x, y]) =>
                x >= 0 && y >= 0 && x < this.size && y < this.size && board[y][x] === 0
            );
        } else {
            moves = this.getOrderedMoves(board, maximizingPlayer ? (aiPlayer || 2) : (3 - (aiPlayer || 2)));
        }

        let bestValue = maximizingPlayer ? -Infinity : Infinity;

        for (const [x, y] of moves) {
            board[y][x] = maximizingPlayer ? (aiPlayer || 2) : (3 - (aiPlayer || 2));

            const value = this.minimaxWithThreats(
                board,
                depth - 1,
                alpha,
                beta,
                !maximizingPlayer,
                { x, y, player: maximizingPlayer ? (aiPlayer || 2) : (3 - (aiPlayer || 2)) },
                aiPlayer
            );

            board[y][x] = 0;

            if (maximizingPlayer) {
                bestValue = Math.max(bestValue, value);
                alpha = Math.max(alpha, value);
            } else {
                bestValue = Math.min(bestValue, value);
                beta = Math.min(beta, value);
            }

            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }

        this.transpositionTable.set(hash, { value: bestValue, depth });
        return bestValue;
    }

    getOrderedMoves(board, player) {
        const moves = this.getCandidateMoves(board);
        const scoredMoves = [];

        for (const [x, y] of moves) {
            // 쌍삼 체크 - 금지수는 제외
            if (this.checkDoubleThree(board, x, y, player)) {
                continue;
            }

            board[y][x] = player;

            let score = 0;

            // Quick win check
            if (this.checkWin(board, x, y, player)) {
                board[y][x] = 0;
                return [[x, y]]; // Return immediately
            }

            // Evaluate position
            const evalResult = this.evaluatePosition(board, player);
            score = evalResult.score;

            // Add position weight
            score += this.positionWeights[y][x] * 10;

            // Check if this move blocks opponent threat
            board[y][x] = 0;
            board[y][x] = 3 - player;
            const opponentEval = this.evaluatePosition(board, 3 - player);
            if (opponentEval.score > 10000) {
                score += 50000; // Defensive bonus
            }

            board[y][x] = 0;
            scoredMoves.push({ x, y, score });
        }

        // Sort by score and return top moves
        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves.slice(0, Math.min(15, scoredMoves.length)).map(m => [m.x, m.y]);
    }

    getCandidateMoves(board) {
        const moves = [];
        const occupied = [];

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (board[y][x] !== 0) {
                    occupied.push([x, y]);
                }
            }
        }

        // If board is empty, play center
        if (occupied.length === 0) {
            const center = Math.floor(this.size / 2);
            return [[center, center]];
        }

        const considered = new Set();
        const range = 2; // Consider positions within 2 squares of stones

        for (const [ox, oy] of occupied) {
            for (let dx = -range; dx <= range; dx++) {
                for (let dy = -range; dy <= range; dy++) {
                    const nx = ox + dx;
                    const ny = oy + dy;

                    if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size &&
                        board[ny][nx] === 0) {
                        const key = `${nx},${ny}`;
                        if (!considered.has(key)) {
                            considered.add(key);
                            moves.push([nx, ny]);
                        }
                    }
                }
            }
        }

        return moves;
    }

    checkWin(board, x, y, player) {
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];

        for (const [dx, dy] of dirs) {
            let count = 1;

            let nx = x + dx, ny = y + dy;
            while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                count++;
                nx += dx;
                ny += dy;
            }

            nx = x - dx;
            ny = y - dy;
            while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === player) {
                count++;
                nx -= dx;
                ny -= dy;
            }

            if (count >= 5) return true;
        }

        return false;
    }

    // 쌍삼 체크 함수
    checkDoubleThree(board, x, y, player) {
        board[y][x] = player; // 임시 착수
        let count = 0;
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];

        for (const [dx, dy] of dirs) {
            let line = "";
            // 충분히 넓게 잡기 (좌우 -4 ~ +4, 총 9칸)
            for (let k = -4; k <= 4; k++) {
                let nx = x + k*dx, ny = y + k*dy;
                if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) {
                    line += "X"; // 범위 밖
                } else if (board[ny][nx] === player) {
                    line += "O";
                } else if (board[ny][nx] === 0) {
                    line += "_";
                } else {
                    line += "X"; // 상대 돌
                }
            }

            // 5칸 단위 substring으로 검사
            for (let i = 0; i <= line.length - 5; i++) {
                if (line.substring(i, i+5) === "_OOO_") {
                    count++;
                }
            }
        }

        board[y][x] = 0; // 되돌리기
        return count >= 2; // 쌍삼이면 true
    }

    // Iterative deepening with time control
    iterativeDeepening(board, maxDepth = 6, timeLimit = 5000, playerNumber = 2) {
        const startTime = Date.now();
        let bestMove = null;
        let bestScore = -Infinity;

        for (let depth = 2; depth <= maxDepth; depth++) {
            if (Date.now() - startTime > timeLimit * 0.8) break;

            this.nodeCount = 0;
            const moves = this.getOrderedMoves(board, playerNumber);

            for (const [x, y] of moves) {
                if (Date.now() - startTime > timeLimit * 0.9) break;

                board[y][x] = playerNumber;
                const score = this.minimaxWithThreats(board, depth - 1, -Infinity, Infinity, false, {x, y, player: playerNumber}, playerNumber);
                board[y][x] = 0;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = {x, y};
                }
            }

            // 로그 비활성화
        }

        return bestMove;
    }

    // Main AI move function
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

        // Clear transposition table if it's too large
        if (this.transpositionTable.size > 100000) {
            this.transpositionTable.clear();
        }

        const opponent = 3 - playerNumber;

        // 1. Check for immediate win
        const moves = this.getCandidateMoves(board);
        for (const [x, y] of moves) {
            // 쌍삼 체크는 하지 않음 - 이기는 수는 예외
            board[y][x] = playerNumber;
            if (this.checkWin(board, x, y, playerNumber)) {
                board[y][x] = 0;
                return {x, y};
            }
            board[y][x] = 0;
        }

        // 2. Check for immediate defense (5-in-a-row)
        for (const [x, y] of moves) {
            board[y][x] = opponent;
            if (this.checkWin(board, x, y, opponent)) {
                board[y][x] = 0;
                // 쌍삼이어도 상대 5목을 막는 것이 우선
                if (!this.checkDoubleThree(board, x, y, playerNumber)) {
                    return {x, y};
                }
            }
            board[y][x] = 0;
        }

        // 3. Check for opponent's open-4 (must block)
        const open4Move = this.findOpponentOpenFour(board, opponent);
        if (open4Move) {
            if (!this.checkDoubleThree(board, open4Move.x, open4Move.y, playerNumber)) {
                return open4Move;
            }
        }

        // 4. Check for opponent's open-3 (should block)
        const open3Move = this.findOpponentOpenThree(board, opponent);
        if (open3Move) {
            if (!this.checkDoubleThree(board, open3Move.x, open3Move.y, playerNumber)) {
                return open3Move;
            }
        }

        // 5. Check for VCF
        const vcfMove = this.searchVCF(board, playerNumber, 8);
        if (vcfMove) {
            return vcfMove;
        }

        // 6. Check opponent VCF and block
        const opponentVCF = this.searchVCF(board, opponent, 6);
        if (opponentVCF) {
            return opponentVCF;
        }

        // 7. Iterative deepening search
        const bestMove = this.iterativeDeepening(board, 6, 3000, playerNumber);

        if (bestMove) {
            return bestMove;
        }

        // Fallback: center or random
        const fallbackCenter = Math.floor(this.size / 2);
        if (board[fallbackCenter][fallbackCenter] === 0) {
            return {x: fallbackCenter, y: fallbackCenter};
        }

        const validMoves = moves.filter(([x, y]) => board[y][x] === 0);
        if (validMoves.length > 0) {
            const [x, y] = validMoves[0];
            return {x, y};
        }

        return null;
    }

    // 상대방의 열린 4목 찾기
    findOpponentOpenFour(board, opponent) {
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];
        const moves = this.getCandidateMoves(board);

        for (const [x, y] of moves) {
            board[y][x] = opponent;

            for (const [dx, dy] of dirs) {
                let count = 1;
                let openEnds = 0;

                // 한쪽 방향 확인
                let nx = x + dx, ny = y + dy;
                while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === opponent) {
                    count++;
                    nx += dx;
                    ny += dy;
                }
                if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === 0) {
                    openEnds++;
                }

                // 반대 방향 확인
                nx = x - dx;
                ny = y - dy;
                while (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === opponent) {
                    count++;
                    nx -= dx;
                    ny -= dy;
                }
                if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && board[ny][nx] === 0) {
                    openEnds++;
                }

                // 열린 4목 확인
                if (count === 4 && openEnds >= 2) {
                    board[y][x] = 0;
                    return {x, y};
                }
            }

            board[y][x] = 0;
        }

        return null;
    }

    // 상대방의 열린 3목 찾기
    findOpponentOpenThree(board, opponent) {
        const dirs = [[1,0], [0,1], [1,1], [1,-1]];
        const moves = this.getCandidateMoves(board);
        const potential = [];

        for (const [x, y] of moves) {
            board[y][x] = opponent;
            let threatScore = 0;

            for (const [dx, dy] of dirs) {
                let line = "";
                // -4에서 +4까지 범위로 확인
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

                // 열린 3목 패턴 체크
                if (line.includes("_OOO_") || line.includes("__OOO__")) {
                    threatScore += 100;
                }
                // 반열린 3목도 체크
                if (line.includes("_OOO") || line.includes("OOO_")) {
                    threatScore += 50;
                }
                // 2목 패턴도 고려
                if (line.includes("_OO_") || line.includes("_O_O_")) {
                    threatScore += 20;
                }
            }

            if (threatScore > 0) {
                potential.push({x, y, score: threatScore});
            }

            board[y][x] = 0;
        }

        // 가장 위험한 위치 반환
        if (potential.length > 0) {
            potential.sort((a, b) => b.score - a.score);
            return {x: potential[0].x, y: potential[0].y};
        }

        return null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OmokCounter;
}