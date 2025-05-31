class BoardGamePlayer {
    constructor() {
        this.baseURL = window.location.origin;
        this.socket = null;
        this.currentUser = null;
        this.currentGame = null;
        this.init();
    }

    async init() {
        this.initializeSocket();
        this.bindEventListeners();
        
        // Check if user is already logged in (simple localStorage check)
        const savedUser = localStorage.getItem('boardgame-user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showGameList();
            } catch (error) {
                localStorage.removeItem('boardgame-user');
            }
        }
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus('Connected', 'success');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus('Disconnected', 'danger');
        });

        this.socket.on('game-started', (data) => {
            console.log('Game started:', data);
            if (this.currentGame && this.currentGame.id === data.gameId) {
                this.loadCurrentGame();
            }
        });

        this.socket.on('move-made', (data) => {
            console.log('Move made:', data);
            if (this.currentGame && this.currentGame.id === data.gameId) {
                this.handleMoveUpdate(data);
            }
        });
    }

    updateConnectionStatus(text, type) {
        const statusElement = document.getElementById('connection-status');
        statusElement.innerHTML = `<span class="badge bg-${type}">${text}</span>`;
    }

    bindEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register button
        document.getElementById('register-btn').addEventListener('click', () => {
            this.handleRegister();
        });

        // Refresh games
        document.getElementById('refresh-games-btn').addEventListener('click', () => {
            this.loadAvailableGames();
        });

        // Move form
        document.getElementById('move-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitMove();
        });

        // Leave game
        document.getElementById('leave-game-btn').addEventListener('click', () => {
            this.leaveGame();
        });

        // Test move button (for debugging)
        document.getElementById('test-move-btn').addEventListener('click', () => {
            this.testMove();
        });

        // Switch user button (for easy testing)
        document.getElementById('switch-user-btn').addEventListener('click', () => {
            this.switchUser();
        });

        // Test helper buttons
        document.getElementById('test-helper-btn').addEventListener('click', () => {
            this.showTestHelper();
        });

        document.getElementById('close-test-alert').addEventListener('click', () => {
            document.getElementById('test-helper-alert').style.display = 'none';
        });

        document.getElementById('create-test-user-btn').addEventListener('click', () => {
            this.createTestUser();
        });

        // Quick login buttons
        document.getElementById('quick-admin-btn').addEventListener('click', () => {
            this.quickLogin('admin', 'admin123');
        });

        document.getElementById('quick-player2-btn').addEventListener('click', () => {
            this.quickLogin('player2', 'test123');
        });

        document.getElementById('quick-anweather-btn').addEventListener('click', () => {
            this.quickLogin('anweather', '123456');
        });

        // Event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            if (e.target.closest('.join-game-btn')) {
                const gameId = e.target.closest('.join-game-btn').dataset.gameId;
                this.joinGame(gameId);
            }
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        try {
            const response = await this.fetchAPI('/api/users/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.currentUser = response.user;
            localStorage.setItem('boardgame-user', JSON.stringify(this.currentUser));
            
            document.getElementById('username-display').textContent = this.currentUser.username;
            document.getElementById('user-info').style.display = 'block';
            
            this.showGameList();
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    }

    async handleRegister() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        try {
            const response = await this.fetchAPI('/api/users/register', {
                method: 'POST',
                body: JSON.stringify({ 
                    username, 
                    password,
                    email: `${username}@example.com` // Simple email generation
                })
            });

            alert('Registration successful! You can now login.');
            document.getElementById('login-form').reset();
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    }

    showGameList() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('game-list-section').style.display = 'block';
        document.getElementById('game-play-section').style.display = 'none';
        this.loadAvailableGames();
    }

    showGamePlay() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('game-list-section').style.display = 'none';
        document.getElementById('game-play-section').style.display = 'block';
    }

    async loadAvailableGames() {
        try {
            const games = await this.fetchAPI('/api/games');
            this.renderGamesList(games);
        } catch (error) {
            console.error('Error loading games:', error);
            document.getElementById('games-grid').innerHTML = 
                '<div class="col-12 text-center text-danger">Error loading games</div>';
        }
    }

    async renderGamesList(games) {
        const gamesGrid = document.getElementById('games-grid');
        
        if (games.length === 0) {
            gamesGrid.innerHTML = '<div class="col-12 text-center text-muted">No games available</div>';
            return;
        }

        // Filter games - show waiting games or active games
        const availableGames = games.filter(game => 
            game.status === 'waiting' || game.status === 'active'
        );

        if (availableGames.length === 0) {
            gamesGrid.innerHTML = '<div class="col-12 text-center text-muted">No joinable games available</div>';
            return;
        }

        // Show loading while we render cards
        gamesGrid.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"></div><p class="mt-2">Loading game details...</p></div>';

        // Render cards one by one
        const gameCards = await Promise.all(
            availableGames.map(game => this.renderGameCard(game))
        );

        gamesGrid.innerHTML = gameCards.join('');
    }

    async isUserInGame(game) {
        try {
            const gameDetails = await this.fetchAPI(`/api/games/${game.id}`);
            return gameDetails.players.some(p => p.userId === this.currentUser.id);
        } catch (error) {
            return false;
        }
    }

    async renderGameCard(game) {
        const statusColor = this.getStatusColor(game.status);
        const isWaiting = game.status === 'waiting';
        
        // Get detailed game info to show player count
        let playerInfo = '';
        try {
            const gameDetails = await this.fetchAPI(`/api/games/${game.id}`);
            const playerCount = gameDetails.players ? gameDetails.players.length : 0;
            const maxPlayers = gameDetails.maxPlayers || 2; // Default to 2 for chess
            const isUserInGame = gameDetails.players ? gameDetails.players.some(p => p.userId === this.currentUser.id) : false;
            
            playerInfo = `
                <p class="card-text">
                    <small class="text-muted">
                        <i class="bi bi-people"></i> ${playerCount}/${maxPlayers} players
                        ${isUserInGame ? '<i class="bi bi-check-circle text-success ms-1" title="You are in this game"></i>' : ''}
                    </small>
                </p>
            `;
            
            if (isWaiting && playerCount < maxPlayers) {
                playerInfo += `
                    <p class="card-text">
                        <small class="text-warning">
                            <i class="bi bi-exclamation-triangle"></i> Waiting for ${maxPlayers - playerCount} more player(s)
                        </small>
                    </p>
                `;
            }
        } catch (error) {
            playerInfo = '<p class="card-text"><small class="text-muted">Loading player info...</small></p>';
        }
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card game-card h-100">
                    <div class="card-body">
                        <h6 class="card-title">${game.name || 'Unnamed Game'}</h6>
                        <p class="card-text">
                            <span class="badge bg-secondary">${this.formatGameType(game.gameType)}</span>
                            <span class="badge bg-${statusColor} ms-1">${game.status}</span>
                        </p>
                        <p class="card-text">
                            <small class="text-muted">
                                <i class="bi bi-clock"></i> Created ${new Date(game.createdAt).toLocaleDateString()}
                            </small>
                        </p>
                        ${playerInfo}
                        <p class="card-text">
                            <small class="text-muted">Moves: ${game.moveCount || 0}</small>
                        </p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary btn-sm join-game-btn w-100" data-game-id="${game.id}">
                            <i class="bi bi-box-arrow-in-right"></i> 
                            ${isWaiting ? 'Join Game' : 'Resume Game'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async joinGame(gameId) {
        try {
            // First, get game details to check if user is already in it
            const gameDetails = await this.fetchAPI(`/api/games/${gameId}`);
            const isAlreadyInGame = gameDetails.players.some(p => p.userId === this.currentUser.id);
            
            if (!isAlreadyInGame && gameDetails.status === 'waiting') {
                // Join the game
                const response = await this.fetchAPI(`/api/games/${gameId}/join`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: this.currentUser.id })
                });
                console.log('Joined game:', response);
            }
            
            // Load the game
            this.currentGame = await this.fetchAPI(`/api/games/${gameId}`);
            this.showGamePlay();
            this.loadCurrentGame();
            
            // Join socket room for real-time updates
            this.socket.emit('join-game', gameId);
            
        } catch (error) {
            alert('Error joining game: ' + error.message);
        }
    }

    async loadCurrentGame() {
        if (!this.currentGame) return;

        try {
            // Refresh game state
            this.currentGame = await this.fetchAPI(`/api/games/${this.currentGame.id}`);
            
            // Update UI
            document.getElementById('game-title').textContent = this.currentGame.name || 'Unnamed Game';
            document.getElementById('game-type').textContent = this.formatGameType(this.currentGame.gameType);
            document.getElementById('game-status').textContent = this.currentGame.status;
            document.getElementById('game-status').className = `badge bg-${this.getStatusColor(this.currentGame.status)}`;
            document.getElementById('move-count').textContent = this.currentGame.moveCount || 0;

            // Update turn info
            const isMyTurn = this.currentGame.currentPlayerId === this.currentUser.id;
            const isActive = this.currentGame.status === 'active';
            
            console.log('Turn check:', {
                currentPlayerId: this.currentGame.currentPlayerId,
                currentUserId: this.currentUser.id,
                isMyTurn,
                isActive,
                gameStatus: this.currentGame.status
            });
            
            document.getElementById('turn-info').style.display = (isMyTurn && isActive) ? 'block' : 'none';
            document.getElementById('waiting-info').style.display = (!isMyTurn && isActive) ? 'block' : 'none';
            
            const submitBtn = document.getElementById('submit-move-btn');
            submitBtn.disabled = !isMyTurn || !isActive;
            
            // Also enable move input
            const moveInput = document.getElementById('move-input');
            moveInput.disabled = !isMyTurn || !isActive;

            // Update players list
            this.renderPlayersList();

            // Load board image
            this.loadBoardImage();

            // Load move history
            this.loadMoveHistory();

        } catch (error) {
            console.error('Error loading game:', error);
        }
    }

    renderPlayersList() {
        const playersList = document.getElementById('players-list');
        
        if (!this.currentGame.players || this.currentGame.players.length === 0) {
            playersList.innerHTML = '<p class="text-muted">No players</p>';
            return;
        }

        const playersHtml = this.currentGame.players.map(player => {
            const isCurrentPlayer = player.userId === this.currentGame.currentPlayerId;
            const isCurrentUser = player.userId === this.currentUser.id;
            
            return `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong>${player.username}</strong> ${isCurrentUser ? '(You)' : ''}
                        ${player.color ? `<small class="text-muted">(${player.color})</small>` : ''}
                    </div>
                    <div>
                        ${isCurrentPlayer ? '<i class="bi bi-cursor text-success" title="Current turn"></i>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        playersList.innerHTML = playersHtml;
    }

    async loadBoardImage() {
        try {
            const boardImage = document.getElementById('board-image');
            const boardLoading = document.getElementById('board-loading');
            
            boardLoading.style.display = 'block';
            boardImage.style.display = 'none';
            
            // Set image source and handle load
            boardImage.onload = () => {
                boardLoading.style.display = 'none';
                boardImage.style.display = 'block';
            };
            
            boardImage.onerror = () => {
                boardLoading.innerHTML = '<p class="text-muted">Board image not available</p>';
            };
            
            boardImage.src = `${this.baseURL}/api/games/${this.currentGame.id}/image?t=${Date.now()}`;
            
        } catch (error) {
            console.error('Error loading board image:', error);
        }
    }

    async loadMoveHistory() {
        try {
            const moves = await this.fetchAPI(`/api/games/${this.currentGame.id}/moves`);
            this.renderMoveHistory(moves);
        } catch (error) {
            console.error('Error loading move history:', error);
            document.getElementById('move-history').innerHTML = '<p class="text-muted">Error loading moves</p>';
        }
    }

    renderMoveHistory(moves) {
        const moveHistory = document.getElementById('move-history');
        
        if (!moves || moves.length === 0) {
            moveHistory.innerHTML = '<p class="text-muted">No moves yet</p>';
            return;
        }

        const movesHtml = moves.map(move => {
            // Handle move.move which can be either a string or JSON
            let moveData;
            try {
                // Try to parse as JSON first (in case it's stored as JSON)
                moveData = typeof move.move === 'string' && (move.move.startsWith('{') || move.move.startsWith('"')) 
                    ? JSON.parse(move.move) 
                    : move.move;
            } catch (error) {
                // If JSON parsing fails, use the raw string
                moveData = move.move;
            }
            
            const moveText = this.formatMove(moveData);
            
            return `
                <div class="mb-1">
                    <strong>${move.moveNumber}.</strong> 
                    ${move.player.username}: ${moveText}
                </div>
            `;
        }).join('');

        moveHistory.innerHTML = movesHtml;
        moveHistory.scrollTop = moveHistory.scrollHeight;
    }

    formatMove(moveData) {
        // Handle different move formats based on game type
        if (typeof moveData === 'string') {
            return moveData;
        }
        
        if (moveData.from && moveData.to) {
            return `${moveData.from}-${moveData.to}`;
        }
        
        return JSON.stringify(moveData);
    }

    async submitMove() {
        console.log('submitMove called');
        const moveInput = document.getElementById('move-input');
        const moveText = moveInput.value.trim();
        
        console.log('Move text:', moveText);
        
        if (!moveText) {
            alert('Please enter a move');
            return;
        }

        if (!this.currentGame) {
            alert('No active game');
            return;
        }

        // Disable button to prevent double submission
        const submitBtn = document.getElementById('submit-move-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting...';

        try {
            // Parse move based on game type
            const move = this.parseMove(moveText, this.currentGame.gameType);
            
            console.log('Parsed move:', move);
            console.log('Submitting to game:', this.currentGame.id);
            console.log('User ID:', this.currentUser.id);
            
            const response = await this.fetchAPI(`/api/games/${this.currentGame.id}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    move: move
                })
            });

            console.log('Move submitted successfully:', response);
            moveInput.value = '';
            
            // Refresh game state
            this.loadCurrentGame();
            
        } catch (error) {
            console.error('Move submission error:', error);
            alert('Error submitting move: ' + error.message);
        } finally {
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async testMove() {
        console.log('testMove called - this bypasses turn checks');
        const moveInput = document.getElementById('move-input');
        const moveText = moveInput.value.trim() || 'e2-e4'; // Default test move
        
        console.log('Test move text:', moveText);
        
        if (!this.currentGame) {
            alert('No active game');
            return;
        }

        try {
            const move = this.parseMove(moveText, this.currentGame.gameType);
            
            console.log('Test move - parsed:', move);
            console.log('Test move - game:', this.currentGame.id);
            console.log('Test move - user:', this.currentUser.id);
            
            const response = await this.fetchAPI(`/api/games/${this.currentGame.id}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    move: move
                })
            });

            console.log('Test move submitted successfully:', response);
            moveInput.value = '';
            this.loadCurrentGame();
            
        } catch (error) {
            console.error('Test move error:', error);
            alert('Test move error: ' + error.message);
        }
    }

    parseMove(moveText, gameType) {
        // Simple move parsing - can be enhanced for each game type
        switch (gameType) {
            case 'chess':
                return this.parseChessMove(moveText);
            case 'checkers':
                return this.parseCheckersMove(moveText);
            case 'hearts':
                return this.parseHeartsMove(moveText);
            default:
                return moveText;
        }
    }

    parseChessMove(moveText) {
        // Normalize to lowercase for chess.js library compatibility
        // The chess.js library is case sensitive and prefers lowercase
        return moveText.trim().toLowerCase();
    }

    parseCheckersMove(moveText) {
        // Handle checkers move format
        if (moveText.includes('-')) {
            const [from, to] = moveText.split('-');
            return { from: from.trim(), to: to.trim() };
        }
        return moveText;
    }

    parseHeartsMove(moveText) {
        // Handle hearts card play
        return moveText.toUpperCase();
    }

    handleMoveUpdate(data) {
        console.log('Handling move update:', data);
        
        // Update current game state
        if (this.currentGame) {
            this.currentGame.currentPlayerId = data.currentPlayerId;
            this.currentGame.moveCount = data.moveCount;
            this.currentGame.boardState = data.newBoardState;
            
            if (data.isGameComplete) {
                this.currentGame.status = 'completed';
            }
        }

        // Refresh the UI
        this.loadCurrentGame();

        // Show notifications
        if (data.currentPlayerId === this.currentUser.id) {
            this.showNotification('It\'s your turn!', 'success');
        } else if (data.isGameComplete) {
            if (data.winner === this.currentUser.id) {
                this.showNotification('Congratulations! You won!', 'success');
            } else if (data.winner) {
                this.showNotification('Game over. Better luck next time!', 'info');
            } else {
                this.showNotification('Game ended in a draw!', 'info');
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create and show a temporary notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    leaveGame() {
        this.currentGame = null;
        this.showGameList();
    }

    showTestHelper() {
        const alert = document.getElementById('test-helper-alert');
        const currentUserSpan = document.getElementById('current-test-user');
        
        currentUserSpan.textContent = this.currentUser ? this.currentUser.username : 'Not logged in';
        alert.style.display = 'block';
    }

    async createTestUser() {
        try {
            const testUsername = 'player2';
            const testPassword = 'test123';
            
            const response = await this.fetchAPI('/api/users/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: testUsername,
                    password: testPassword,
                    email: `${testUsername}@test.com`
                })
            });

            alert(`Test user "${testUsername}" created successfully!\n\nTo test moves:\n1. Open a new browser tab/window\n2. Go to ${window.location.origin}/player.html\n3. Login as "${testUsername}" with password "${testPassword}"\n4. Join the same game\n5. Now you can test moves between both players!`);
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('username')) {
                alert(`Test user "player2" already exists!\n\nTo test moves:\n1. Open a new browser tab/window\n2. Go to ${window.location.origin}/player.html\n3. Login as "player2" with password "test123"\n4. Join the same game\n5. Now you can test moves!`);
            } else {
                alert('Error creating test user: ' + error.message);
            }
        }
    }

    async quickLogin(username, password) {
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
        
        try {
            const response = await this.fetchAPI('/api/users/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.currentUser = response.user;
            localStorage.setItem('boardgame-user', JSON.stringify(this.currentUser));
            
            document.getElementById('username-display').textContent = this.currentUser.username;
            document.getElementById('user-info').style.display = 'block';
            
            this.showGameList();
        } catch (error) {
            // If login fails, try common passwords or show the error
            if (password === 'admin123') {
                await this.quickLogin(username, '123456');
            } else if (password === '123456') {
                await this.quickLogin(username, 'test123');
            } else if (password === 'test123') {
                await this.quickLogin(username, 'password123');
            } else {
                alert(`Quick login failed for ${username}. Try manual login or check password.`);
            }
        }
    }

    async switchUser() {
        if (!this.currentUser) {
            alert('Please login first');
            return;
        }

        // Switch between admin and anweather
        const currentUsername = this.currentUser.username;
        let newUsername, newPassword;

        if (currentUsername === 'admin') {
            newUsername = 'anweather';
            newPassword = '123456';
        } else {
            newUsername = 'admin';
            newPassword = 'admin123';
        }

        try {
            const response = await this.fetchAPI('/api/users/login', {
                method: 'POST',
                body: JSON.stringify({ 
                    username: newUsername, 
                    password: newPassword 
                })
            });

            this.currentUser = response.user;
            localStorage.setItem('boardgame-user', JSON.stringify(this.currentUser));
            
            document.getElementById('username-display').textContent = this.currentUser.username;
            
            // Refresh current game state if we're in a game
            if (this.currentGame) {
                this.loadCurrentGame();
            }

            // Show notification
            this.showNotification(`Switched to user: ${newUsername}`, 'info');
            
        } catch (error) {
            alert('Error switching user: ' + error.message);
        }
    }

    formatGameType(gameType) {
        const types = {
            'chess': 'Chess',
            'checkers': 'Checkers',
            'hearts': 'Hearts'
        };
        return types[gameType] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
    }

    getStatusColor(status) {
        const colors = {
            'waiting': 'warning',
            'active': 'success',
            'completed': 'primary',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    async fetchAPI(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }
}

// Initialize the player client when the page loads
let gamePlayer;
document.addEventListener('DOMContentLoaded', () => {
    gamePlayer = new BoardGamePlayer();
});