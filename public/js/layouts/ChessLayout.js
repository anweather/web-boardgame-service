/**
 * Interactive Chess Layout
 * Provides click-to-move functionality for chess games
 */
class ChessLayout {
    constructor(gamePlayer) {
        this.gamePlayer = gamePlayer;
        this.boardContainer = null;
        this.selectedSquare = null;
        this.selectedPiece = null;
        this.boardState = null;
        this.orientation = 'white'; // Board orientation (white or black)
        this.squareSize = 60; // Size of each square in pixels
        this.init();
    }

    init() {
        console.log('Initializing Chess Layout');
        this.createInteractiveBoard();
        this.bindEventListeners();
    }

    createInteractiveBoard() {
        // Find the board image container
        const boardImageContainer = document.querySelector('#board-image').parentElement;
        
        // Create interactive board container
        this.boardContainer = document.createElement('div');
        this.boardContainer.id = 'interactive-chess-board';
        this.boardContainer.className = 'interactive-chess-board';
        this.boardContainer.style.cssText = `
            position: relative;
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            aspect-ratio: 1;
            border: 2px solid #8B4513;
            border-radius: 8px;
            background: #f9f9f9;
            user-select: none;
            cursor: default;
        `;

        // Add CSS styles for the chess board
        this.addChessStyles();

        // Replace board image with interactive board
        boardImageContainer.innerHTML = '';
        boardImageContainer.appendChild(this.boardContainer);

        this.renderBoard();
    }

    addChessStyles() {
        // Check if styles already exist
        if (document.getElementById('chess-layout-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'chess-layout-styles';
        styles.textContent = `
            .chess-square {
                position: absolute;
                width: 12.5%;
                height: 12.5%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                font-family: serif;
                cursor: pointer;
                transition: background-color 0.2s ease, box-shadow 0.2s ease;
                border: 1px solid transparent;
            }

            .chess-square.light {
                background-color: #F0D9B5;
            }

            .chess-square.dark {
                background-color: #B58863;
            }

            .chess-square:hover {
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
            }

            .chess-square.selected {
                background-color: #7FB069 !important;
                box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.4);
                border: 2px solid #5A8A4A;
            }

            .chess-square.valid-move {
                background-color: #87CEEB !important;
                position: relative;
            }

            .chess-square.valid-move::after {
                content: '●';
                position: absolute;
                font-size: 1.5rem;
                color: rgba(0, 0, 0, 0.4);
                pointer-events: none;
            }

            .chess-square.valid-capture {
                background-color: #FFB6C1 !important;
                border: 2px solid #FF69B4;
            }

            .chess-square.last-move {
                background-color: #FFEB3B !important;
            }

            .chess-piece {
                color: #000;
                text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
                pointer-events: none;
                user-select: none;
            }

            .chess-piece.white {
                color: #FFF;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .chess-coordinates {
                position: absolute;
                font-size: 0.7rem;
                font-weight: bold;
                color: #8B4513;
                pointer-events: none;
                user-select: none;
            }

            .chess-coordinates.file {
                bottom: 2px;
                right: 2px;
            }

            .chess-coordinates.rank {
                top: 2px;
                left: 2px;
            }

            @media (max-width: 768px) {
                .chess-square {
                    font-size: 2rem;
                }
                
                .chess-square.valid-move::after {
                    font-size: 1.2rem;
                }
                
                .chess-coordinates {
                    font-size: 0.6rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    renderBoard() {
        if (!this.boardContainer) return;

        // Clear existing board
        this.boardContainer.innerHTML = '';

        // Get current board state
        const board = this.getBoardArray();

        // Render squares and pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                this.renderSquare(row, col, board[row][col]);
            }
        }
    }

    renderSquare(row, col, piece) {
        const square = document.createElement('div');
        square.className = 'chess-square';
        square.dataset.row = row;
        square.dataset.col = col;
        square.dataset.square = this.getSquareName(row, col);

        // Position square
        const left = col * 12.5;
        const top = row * 12.5;
        square.style.left = `${left}%`;
        square.style.top = `${top}%`;

        // Add light/dark square class
        const isLight = (row + col) % 2 === 0;
        square.classList.add(isLight ? 'light' : 'dark');

        // Add coordinates on edge squares
        if (row === 7) {
            const fileLabel = document.createElement('div');
            fileLabel.className = 'chess-coordinates file';
            fileLabel.textContent = String.fromCharCode(97 + col); // a-h
            square.appendChild(fileLabel);
        }
        if (col === 0) {
            const rankLabel = document.createElement('div');
            rankLabel.className = 'chess-coordinates rank';
            rankLabel.textContent = 8 - row; // 8-1
            square.appendChild(rankLabel);
        }

        // Add piece if present
        if (piece) {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'chess-piece';
            pieceElement.classList.add(piece === piece.toUpperCase() ? 'white' : 'black');
            
            // Convert piece notation to Unicode symbols
            const pieceSymbols = {
                'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
                'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
            };
            
            pieceElement.textContent = pieceSymbols[piece] || piece;
            square.appendChild(pieceElement);
        }

        this.boardContainer.appendChild(square);
    }

    bindEventListeners() {
        if (!this.boardContainer) return;

        this.boardContainer.addEventListener('click', (e) => {
            const square = e.target.closest('.chess-square');
            if (!square) return;

            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const squareName = square.dataset.square;

            this.handleSquareClick(row, col, squareName, square);
        });
    }

    handleSquareClick(row, col, squareName, squareElement) {
        console.log(`Clicked square: ${squareName} (${row}, ${col})`);
        
        const board = this.getBoardArray();
        const piece = board[row][col];
        console.log(`Piece at ${squareName}: ${piece}`);

        // Check if this is a valid move target
        if (this.selectedSquare && this.isValidMove(this.selectedSquare, squareName)) {
            this.makeMove(this.selectedSquare, squareName);
            return;
        }

        // Check if there's a piece on this square that belongs to the current player
        if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
            console.log(`Selecting piece ${piece} at ${squareName}`);
            this.selectSquare(squareName, squareElement);
        } else if (this.selectedSquare) {
            // Try to move to empty square or capture
            if (this.isValidMove(this.selectedSquare, squareName)) {
                this.makeMove(this.selectedSquare, squareName);
            } else {
                console.log(`Invalid move or clearing selection`);
                this.clearSelection();
            }
        }
    }

    selectSquare(squareName, squareElement) {
        // Clear previous selection
        this.clearSelection();

        // Select new square
        this.selectedSquare = squareName;
        squareElement.classList.add('selected');

        // Highlight valid moves
        this.highlightValidMoves(squareName);

        console.log(`Selected square: ${squareName}`);
    }

    clearSelection() {
        // Remove all highlights
        document.querySelectorAll('.chess-square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture');
        });

        this.selectedSquare = null;
        this.selectedPiece = null;
    }

    highlightValidMoves(fromSquare) {
        // For now, just show all possible squares as potential moves
        // In a full implementation, this would calculate legal moves
        const board = this.getBoardArray();
        const fromPos = this.parseSquareName(fromSquare);
        const piece = board[fromPos.row][fromPos.col];

        console.log(`Highlighting moves for ${piece} at ${fromSquare} (row: ${fromPos.row}, col: ${fromPos.col})`);

        if (!piece) return;

        // Get basic movement patterns for the piece
        const possibleMoves = this.getPossibleMoves(piece, fromPos, board);

        console.log(`Found ${possibleMoves.length} possible moves:`, possibleMoves);

        possibleMoves.forEach(move => {
            const square = document.querySelector(`[data-square="${move.to}"]`);
            console.log(`Looking for square ${move.to}, found:`, square);
            if (square) {
                if (move.isCapture) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }
        });
    }

    getPossibleMoves(piece, fromPos, board) {
        const moves = [];
        const pieceType = piece.toLowerCase();
        const isWhite = piece === piece.toUpperCase();
        
        // Basic move generation - simplified for demonstration
        switch (pieceType) {
            case 'p': // Pawn
                moves.push(...this.getPawnMoves(fromPos, isWhite, board));
                break;
            case 'r': // Rook
                moves.push(...this.getRookMoves(fromPos, board));
                break;
            case 'n': // Knight
                moves.push(...this.getKnightMoves(fromPos, board));
                break;
            case 'b': // Bishop
                moves.push(...this.getBishopMoves(fromPos, board));
                break;
            case 'q': // Queen
                moves.push(...this.getQueenMoves(fromPos, board));
                break;
            case 'k': // King
                moves.push(...this.getKingMoves(fromPos, board));
                break;
        }

        return moves.filter(move => this.isSquareValid(move.to));
    }

    getPawnMoves(fromPos, isWhite, board) {
        const moves = [];
        // White pawns move "up" the board (decreasing row numbers: 6->5->4->etc)
        // Black pawns move "down" the board (increasing row numbers: 1->2->3->etc)
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        console.log(`Pawn move calculation: ${isWhite ? 'white' : 'black'} pawn at row ${fromPos.row}, col ${fromPos.col}, direction ${direction}`);
        
        // Forward move
        const oneForward = { row: fromPos.row + direction, col: fromPos.col };
        console.log(`One forward: row ${oneForward.row}, col ${oneForward.col}`);
        
        if (this.isPositionValid(oneForward) && !board[oneForward.row][oneForward.col]) {
            const moveSquare = this.getSquareName(oneForward.row, oneForward.col);
            console.log(`Adding one forward move to ${moveSquare}`);
            moves.push({ to: moveSquare, isCapture: false });
            
            // Two squares forward from starting position
            if (fromPos.row === startRow) {
                const twoForward = { row: fromPos.row + 2 * direction, col: fromPos.col };
                console.log(`Two forward: row ${twoForward.row}, col ${twoForward.col}`);
                if (this.isPositionValid(twoForward) && !board[twoForward.row][twoForward.col]) {
                    const twoMoveSquare = this.getSquareName(twoForward.row, twoForward.col);
                    console.log(`Adding two forward move to ${twoMoveSquare}`);
                    moves.push({ to: twoMoveSquare, isCapture: false });
                }
            }
        }
        
        // Captures
        const captureLeft = { row: fromPos.row + direction, col: fromPos.col - 1 };
        const captureRight = { row: fromPos.row + direction, col: fromPos.col + 1 };
        
        [captureLeft, captureRight].forEach(pos => {
            if (this.isPositionValid(pos) && board[pos.row][pos.col] && 
                this.isPieceOpponent(board[pos.row][pos.col], isWhite)) {
                const captureSquare = this.getSquareName(pos.row, pos.col);
                console.log(`Adding capture move to ${captureSquare}`);
                moves.push({ to: captureSquare, isCapture: true });
            }
        });
        
        console.log(`Total pawn moves: ${moves.length}`, moves);
        return moves;
    }

    getRookMoves(fromPos, board) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        
        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newPos = { row: fromPos.row + i * dRow, col: fromPos.col + i * dCol };
                if (!this.isPositionValid(newPos)) break;
                
                const targetPiece = board[newPos.row][newPos.col];
                if (!targetPiece) {
                    moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: false });
                } else {
                    if (this.isPieceOpponent(targetPiece, this.isCurrentPlayerWhite())) {
                        moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: true });
                    }
                    break;
                }
            }
        });
        
        return moves;
    }

    getKnightMoves(fromPos, board) {
        const moves = [];
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        
        knightMoves.forEach(([dRow, dCol]) => {
            const newPos = { row: fromPos.row + dRow, col: fromPos.col + dCol };
            if (this.isPositionValid(newPos)) {
                const targetPiece = board[newPos.row][newPos.col];
                if (!targetPiece) {
                    moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: false });
                } else if (this.isPieceOpponent(targetPiece, this.isCurrentPlayerWhite())) {
                    moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: true });
                }
            }
        });
        
        return moves;
    }

    getBishopMoves(fromPos, board) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newPos = { row: fromPos.row + i * dRow, col: fromPos.col + i * dCol };
                if (!this.isPositionValid(newPos)) break;
                
                const targetPiece = board[newPos.row][newPos.col];
                if (!targetPiece) {
                    moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: false });
                } else {
                    if (this.isPieceOpponent(targetPiece, this.isCurrentPlayerWhite())) {
                        moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: true });
                    }
                    break;
                }
            }
        });
        
        return moves;
    }

    getQueenMoves(fromPos, board) {
        return [...this.getRookMoves(fromPos, board), ...this.getBishopMoves(fromPos, board)];
    }

    getKingMoves(fromPos, board) {
        const moves = [];
        const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        
        kingMoves.forEach(([dRow, dCol]) => {
            const newPos = { row: fromPos.row + dRow, col: fromPos.col + dCol };
            if (this.isPositionValid(newPos)) {
                const targetPiece = board[newPos.row][newPos.col];
                if (!targetPiece) {
                    moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: false });
                } else if (this.isPieceOpponent(targetPiece, this.isCurrentPlayerWhite())) {
                    moves.push({ to: this.getSquareName(newPos.row, newPos.col), isCapture: true });
                }
            }
        });
        
        return moves;
    }

    isValidMove(fromSquare, toSquare) {
        // Simplified validation - in a real implementation, this would check legal moves
        const board = this.getBoardArray();
        const fromPos = this.parseSquareName(fromSquare);
        const toPos = this.parseSquareName(toSquare);
        
        const piece = board[fromPos.row][fromPos.col];
        if (!piece) return false;

        // Check if move is in the possible moves list
        const possibleMoves = this.getPossibleMoves(piece, fromPos, board);
        return possibleMoves.some(move => move.to === toSquare);
    }

    makeMove(fromSquare, toSquare) {
        console.log(`Making move: ${fromSquare} to ${toSquare}`);

        // Format move for the backend
        const moveText = `${fromSquare}-${toSquare}`;

        // Clear selection
        this.clearSelection();

        // Submit move through the game player
        this.submitMove(moveText);
    }

    async submitMove(moveText) {
        if (!this.gamePlayer.currentGame) {
            console.error('No active game');
            return;
        }

        try {
            const move = this.gamePlayer.parseMove(moveText, this.gamePlayer.currentGame.gameType);
            
            const response = await this.gamePlayer.fetchAPI(`/api/games/${this.gamePlayer.currentGame.id}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: this.gamePlayer.currentUser.id,
                    move: move
                })
            });

            console.log('Move submitted successfully:', response);
            
            // Update board state if provided in response
            if (response.newBoardState) {
                this.updateBoardState(response.newBoardState);
            }
            
            // Refresh game state (this will skip board image loading due to active layout)
            this.gamePlayer.loadCurrentGame();
            
        } catch (error) {
            console.error('Move submission error:', error);
            this.gamePlayer.showMoveError(error.message, moveText);
        }
    }

    isPieceOwnedByCurrentPlayer(piece) {
        if (!this.gamePlayer.currentGame || !this.gamePlayer.currentUser) return false;

        const isWhite = piece === piece.toUpperCase();
        const currentPlayerIsWhite = this.isCurrentPlayerWhite();
        console.log(`Piece ${piece} is ${isWhite ? 'white' : 'black'}, current player is ${currentPlayerIsWhite ? 'white' : 'black'}, owned: ${currentPlayerIsWhite === isWhite}`);
        return currentPlayerIsWhite === isWhite;
    }

    isPieceOpponent(piece, isCurrentPlayerWhite) {
        const isWhite = piece === piece.toUpperCase();
        return isCurrentPlayerWhite !== isWhite;
    }

    isCurrentPlayerWhite() {
        // Determine if current player is white based on player order
        if (!this.gamePlayer.currentGame || !this.gamePlayer.currentUser) return true;

        const currentPlayer = this.gamePlayer.currentGame.players.find(p => p.userId === this.gamePlayer.currentUser.id);
        const isWhite = currentPlayer && currentPlayer.color === 'white';
        console.log(`Current player:`, currentPlayer, `is white: ${isWhite}`);
        return isWhite;
    }

    updateBoardState(boardState) {
        this.boardState = boardState;
        this.renderBoard();
    }

    getBoardArray() {
        if (this.boardState && this.boardState.board) {
            return this.boardState.board;
        }
        
        if (this.gamePlayer.currentGame && this.gamePlayer.currentGame.boardState) {
            const boardState = this.gamePlayer.currentGame.boardState;
            if (boardState.board) {
                return boardState.board;
            }
        }

        // Return initial position if no board state available
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    }

    getSquareName(row, col) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        return files[col] + ranks[row];
    }

    parseSquareName(squareName) {
        const file = squareName.charCodeAt(0) - 97; // a=0, b=1, etc.
        const rank = 8 - parseInt(squareName[1]); // 8=0, 7=1, etc.
        return { row: rank, col: file };
    }

    isPositionValid(pos) {
        return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
    }

    isSquareValid(squareName) {
        if (squareName.length !== 2) return false;
        const file = squareName.charCodeAt(0);
        const rank = parseInt(squareName[1]);
        return file >= 97 && file <= 104 && rank >= 1 && rank <= 8; // a-h, 1-8
    }

    destroy() {
        // Clean up when layout is destroyed
        if (this.boardContainer) {
            this.boardContainer.remove();
        }
        
        // Remove styles
        const styles = document.getElementById('chess-layout-styles');
        if (styles) {
            styles.remove();
        }
        
        console.log('Chess Layout destroyed');
    }
}

// Make available globally
window.ChessLayout = ChessLayout;