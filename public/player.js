class BoardGamePlayer {
    constructor() {
        this.baseURL = window.location.origin;
        this.socket = null;
        this.currentUser = null;
        this.currentGame = null;
        this.pluginManager = new GamePluginManager();
        this.init();
    }

    async init() {
        this.initializeSocket();
        this.bindEventListeners();
        this.setupResponsiveHandling();
        
        // Check URL parameters for game persistence
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');
        const userId = urlParams.get('user');
        
        // Check if user is already logged in (simple localStorage check)
        const savedUser = localStorage.getItem('boardgame-user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                
                // If we have a game ID in URL, try to load that game directly
                if (gameId) {
                    await this.loadGameFromURL(gameId, userId);
                } else {
                    this.showGameList();
                }
            } catch (error) {
                localStorage.removeItem('boardgame-user');
                this.showLoginSection();
            }
        } else if (gameId && userId) {
            // If not logged in but URL has user/game params, show login with hint
            this.showLoginWithGameHint(gameId, userId);
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

    setupResponsiveHandling() {
        // Only reload board image on significant resize events to prevent flickering
        let resizeTimeout;
        let lastWidth = window.innerWidth;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.currentGame) {
                    const currentWidth = window.innerWidth;
                    // Only reload if width changed significantly (more than 100px)
                    if (Math.abs(currentWidth - lastWidth) > 100) {
                        console.log('Significant window resize detected, refreshing board image');
                        lastWidth = currentWidth;
                        this.loadBoardImage();
                    }
                }
            }, 1000); // Increased debounce to 1 second to reduce flickering
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

        // Copy game link
        document.getElementById('copy-game-link-btn').addEventListener('click', () => {
            this.copyGameLink();
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

        // Move help toggle
        document.getElementById('toggle-move-help').addEventListener('click', () => {
            this.toggleMoveHelp();
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

    showLoginSection() {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('game-list-section').style.display = 'none';
        document.getElementById('game-play-section').style.display = 'none';
    }

    showLoginWithGameHint(gameId, userId) {
        this.showLoginSection();
        // Add visual hint that there's a game waiting
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            const existingHint = document.getElementById('game-hint');
            if (existingHint) existingHint.remove();
            
            const hint = document.createElement('div');
            hint.id = 'game-hint';
            hint.className = 'alert alert-info mt-2';
            hint.innerHTML = `<i class="bi bi-info-circle"></i> You have a game link! Login to continue to game ${gameId}`;
            loginForm.appendChild(hint);
        }
    }

    async loadGameFromURL(gameId, userId) {
        try {
            // Check if the URL user ID matches current user
            if (userId && this.currentUser.id !== parseInt(userId)) {
                console.warn('URL user ID does not match current user, ignoring user parameter');
            }
            
            // Try to load the game
            const game = await this.fetchAPI(`/api/games/${gameId}`);
            
            // Check if current user is in this game
            const isUserInGame = game.players.some(p => p.userId === this.currentUser.id);
            
            if (!isUserInGame) {
                // Try to join the game if it's still waiting
                if (game.status === 'waiting') {
                    await this.joinGameInternal(gameId);
                } else {
                    alert('You are not a player in this game');
                    this.showGameList();
                    this.clearURLParams();
                    return;
                }
            }
            
            // Load the game
            this.currentGame = game;
            this.showGamePlay();
            this.loadCurrentGame();
            
            // Join socket room for real-time updates
            this.socket.emit('join-game', gameId);
            
        } catch (error) {
            console.error('Error loading game from URL:', error);
            alert('Could not load game: ' + error.message);
            this.showGameList();
            this.clearURLParams();
        }
    }

    updateURLForGame(gameId) {
        const url = new URL(window.location);
        url.searchParams.set('game', gameId);
        url.searchParams.set('user', this.currentUser.id);
        window.history.replaceState({}, '', url);
    }

    clearURLParams() {
        const url = new URL(window.location);
        url.searchParams.delete('game');
        url.searchParams.delete('user');
        window.history.replaceState({}, '', url);
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
            await this.joinGameInternal(gameId);
            
            // Load the game
            this.currentGame = await this.fetchAPI(`/api/games/${gameId}`);
            this.showGamePlay();
            this.loadCurrentGame();
            
            // Update URL with game parameters for persistence and bookmarking
            this.updateURLForGame(gameId);
            
            // Join socket room for real-time updates
            this.socket.emit('join-game', gameId);
            
        } catch (error) {
            alert('Error joining game: ' + error.message);
        }
    }

    async joinGameInternal(gameId) {
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

            // Update move input UI for current game type
            this.updateMoveInputUI();

        } catch (error) {
            console.error('Error loading game:', error);
        }
    }

    updateMoveInputUI() {
        // Update move input placeholder and help text based on current game type
        if (!this.currentGame) return;
        
        try {
            const moveInput = document.getElementById('move-input');
            const helpText = moveInput.parentElement.querySelector('.form-text');
            
            const gameType = this.currentGame.gameType;
            const placeholder = this.pluginManager.getMoveInputPlaceholder(gameType);
            const help = this.pluginManager.getMoveInputHelp(gameType);
            
            if (moveInput) {
                moveInput.placeholder = placeholder;
            }
            
            if (helpText) {
                helpText.textContent = help;
            }

            // Update UI based on game-specific configuration
            this.updateGameSpecificUI(gameType);
            
        } catch (error) {
            console.warn('Error updating move input UI:', error);
        }
    }

    updateGameSpecificUI(gameType) {
        try {
            const uiConfig = this.pluginManager.getUIConfig(gameType);
            
            // Show/hide switch user button
            const switchUserBtn = document.getElementById('switch-user-btn');
            if (switchUserBtn) {
                switchUserBtn.style.display = uiConfig.showSwitchUserButton ? 'block' : 'none';
            }

            // Show/hide test move button  
            const testMoveBtn = document.getElementById('test-move-btn');
            if (testMoveBtn) {
                testMoveBtn.style.display = uiConfig.showTestMoveButton ? 'block' : 'none';
            }

            // Show/hide move help
            const moveHelpCard = document.getElementById('move-help-card');
            if (moveHelpCard) {
                if (uiConfig.showMoveHelp) {
                    moveHelpCard.style.display = 'block';
                    this.renderMoveHelp(gameType);
                } else {
                    moveHelpCard.style.display = 'none';
                }
            }

            // Update turn info for single player games
            if (uiConfig.singlePlayer) {
                const waitingInfo = document.getElementById('waiting-info');
                if (waitingInfo) {
                    waitingInfo.style.display = 'none';
                }
            }

        } catch (error) {
            console.warn('Error updating game-specific UI:', error);
        }
    }

    renderMoveHelp(gameType) {
        try {
            const commands = this.pluginManager.getMoveCommands(gameType);
            const quickRef = this.pluginManager.getQuickReference(gameType);
            const moveCommandsDiv = document.getElementById('move-commands');
            
            if (!moveCommandsDiv || commands.length === 0) return;

            let html = '';

            // Quick reference section
            if (Object.keys(quickRef).length > 0) {
                html += '<div class="mb-3"><h6 class="text-muted mb-2">Quick Reference</h6>';
                html += '<div class="row">';
                
                Object.entries(quickRef).forEach(([category, cmds]) => {
                    html += `<div class="col-6 mb-2">`;
                    html += `<strong class="d-block small">${category}:</strong>`;
                    html += `<span class="badge bg-light text-dark me-1 small">${cmds.join('</span> <span class="badge bg-light text-dark me-1 small">')}</span>`;
                    html += `</div>`;
                });
                
                html += '</div></div>';
            }

            // Detailed commands
            commands.forEach(category => {
                html += `<div class="mb-3">`;
                html += `<h6 class="text-muted mb-2">${category.category}</h6>`;
                html += `<div class="table-responsive">`;
                html += `<table class="table table-sm">`;
                
                category.commands.forEach(cmd => {
                    html += `<tr>`;
                    html += `<td class="text-nowrap"><code class="small">${cmd.shorthand}</code></td>`;
                    html += `<td class="small text-muted">${cmd.description}</td>`;
                    html += `</tr>`;
                });
                
                html += `</table></div></div>`;
            });

            moveCommandsDiv.innerHTML = html;

        } catch (error) {
            console.warn('Error rendering move help:', error);
        }
    }

    toggleMoveHelp() {
        const content = document.getElementById('move-help-content');
        const chevron = document.getElementById('help-chevron');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            chevron.className = 'bi bi-chevron-up';
        } else {
            content.style.display = 'none';
            chevron.className = 'bi bi-chevron-down';
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
            
            // Calculate optimal image size based on container width
            const container = boardImage.parentElement;
            const containerWidth = container.clientWidth;
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            // Request image size based on container size and device pixel ratio
            // This ensures crisp images on high-DPI displays
            const requestedSize = Math.min(1200, Math.max(400, containerWidth * devicePixelRatio));
            
            // Set image source and handle load
            boardImage.onload = () => {
                boardLoading.style.display = 'none';
                boardImage.style.display = 'block';
            };
            
            boardImage.onerror = () => {
                boardLoading.innerHTML = '<p class="text-muted">Board image not available</p>';
            };
            
            // Add size parameters to the image URL
            const imageUrl = new URL(`${this.baseURL}/api/games/${this.currentGame.id}/image`);
            imageUrl.searchParams.set('width', requestedSize);
            imageUrl.searchParams.set('height', requestedSize);
            imageUrl.searchParams.set('t', Date.now()); // Cache busting
            
            boardImage.src = imageUrl.toString();
            
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
            
            const moveText = this.formatMove(moveData, this.currentGame?.gameType);
            
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

    formatMove(moveData, gameType) {
        // Use plugin manager for game-agnostic move formatting
        if (!gameType) {
            // Fallback for when game type is not available
            return typeof moveData === 'string' ? moveData : JSON.stringify(moveData);
        }
        return this.pluginManager.formatMove(moveData, gameType);
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
            this.showMoveError(error.message, moveText);
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
            this.showMoveError(error.message, moveText);
        }
    }

    parseMove(moveText, gameType) {
        // Use plugin manager for game-agnostic move parsing
        return this.pluginManager.parseMove(moveText, gameType);
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

    showMoveError(errorMessage, attemptedMove) {
        // Enhanced error display with context and suggestions
        const gameType = this.currentGame?.gameType || 'unknown';
        
        // Create detailed error message with context
        let detailedMessage = `<strong>Move Failed:</strong> "${attemptedMove}"<br>`;
        detailedMessage += `<strong>Reason:</strong> ${errorMessage}<br>`;
        
        // Add game-specific help based on error type
        if (gameType === 'solitaire') {
            detailedMessage += '<br><strong>Try instead:</strong><br>';
            
            if (errorMessage.includes('Stock pile is empty')) {
                detailedMessage += '• Type "r" or "reset" to reset the stock pile';
            } else if (errorMessage.includes('Foundation must start with Ace')) {
                detailedMessage += '• Foundations start with Ace (A), try moving an Ace first';
            } else if (errorMessage.includes('Expected') && errorMessage.includes('got')) {
                detailedMessage += '• Foundation cards must go in order: A, 2, 3... J, Q, K';
            } else if (errorMessage.includes('Empty tableau column must start with King')) {
                detailedMessage += '• Only Kings can be placed on empty tableau columns';
            } else if (errorMessage.includes('Cards must alternate color')) {
                detailedMessage += '• Tableau cards must alternate red/black (e.g., red 7 on black 8)';
            } else if (errorMessage.includes('face-down card')) {
                detailedMessage += '• Flip the card first with "f1" through "f7"';
            } else if (errorMessage.includes('Unrecognized move format')) {
                detailedMessage += '• Use shortcuts: "d" (draw), "wh" (waste→hearts), "1-7" (tableau moves)';
            }
            
            detailedMessage += '<br><small class="text-muted">See Move Commands panel for all available commands</small>';
        }
        
        // Show as a more prominent error notification
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        errorAlert.style.cssText = 'top: 80px; right: 20px; z-index: 9999; max-width: 400px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);';
        errorAlert.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${detailedMessage}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(errorAlert);
        
        // Auto-remove after 8 seconds (longer for error messages)
        setTimeout(() => {
            if (errorAlert.parentNode) {
                errorAlert.remove();
            }
        }, 8000);
        
        // Also log to console for debugging
        console.warn(`Move error - Game: ${gameType}, Attempted: "${attemptedMove}", Error: ${errorMessage}`);
    }

    copyGameLink() {
        if (!this.currentGame || !this.currentUser) {
            alert('No active game to copy link for');
            return;
        }

        const gameUrl = `${window.location.origin}${window.location.pathname}?game=${this.currentGame.id}&user=${this.currentUser.id}`;
        
        // Try to use the modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(gameUrl).then(() => {
                this.showNotification('Game link copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
                this.fallbackCopyToClipboard(gameUrl);
            });
        } else {
            // Fallback for older browsers or non-secure contexts
            this.fallbackCopyToClipboard(gameUrl);
        }
    }

    fallbackCopyToClipboard(text) {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('Game link copied to clipboard!', 'success');
        } catch (err) {
            console.error('Fallback copy failed:', err);
            // Show the URL in a prompt as last resort
            prompt('Copy this game link:', text);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    leaveGame() {
        this.currentGame = null;
        this.clearURLParams(); // Remove game parameters from URL
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
        // Use plugin manager to get display name
        try {
            return this.pluginManager.getDisplayName(gameType);
        } catch (error) {
            // Fallback to simple capitalization
            return gameType ? gameType.charAt(0).toUpperCase() + gameType.slice(1) : 'Game';
        }
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