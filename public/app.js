class AdminPanel {
    constructor() {
        this.baseURL = window.location.origin;
        this.socket = null;
        this.init();
    }

    async init() {
        this.initializeSocket();
        this.bindEventListeners();
        await this.loadDashboard();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateStatus('Connected', 'success');
        });

        this.socket.on('disconnect', () => {
            this.updateStatus('Disconnected', 'danger');
        });

        this.socket.on('game-update', (data) => {
            this.handleGameUpdate(data);
        });
    }

    updateStatus(text, type) {
        const statusElement = document.getElementById('status-indicator');
        statusElement.innerHTML = `<span class="badge bg-${type}">${text}</span>`;
    }

    bindEventListeners() {
        // Tab switching - use click events instead of Bootstrap tab events
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all tabs
                document.querySelectorAll('.list-group-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to clicked tab
                e.target.classList.add('active');
                
                // Hide all tab panes
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                
                // Show target tab pane
                const target = e.target.getAttribute('href').substring(1);
                const targetPane = document.getElementById(target);
                if (targetPane) {
                    targetPane.classList.add('show', 'active');
                }
                
                // Load content for the tab
                this.loadTabContent(target);
            });
        });

        // Create game form
        document.getElementById('createGameBtn').addEventListener('click', () => {
            console.log('Create game button clicked');
            this.createGame();
        });

        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('refresh-btn')) {
                const tab = e.target.dataset.tab;
                this.loadTabContent(tab);
            }
            
            // Handle view game button clicks
            if (e.target.closest('.view-game-btn')) {
                const gameId = e.target.closest('.view-game-btn').dataset.gameId;
                this.viewGame(gameId);
            }
            
            // Handle view image button clicks
            if (e.target.closest('.view-image-btn')) {
                const gameId = e.target.closest('.view-image-btn').dataset.gameId;
                this.viewGameImage(gameId);
            }
            
            // Handle test game type button clicks
            if (e.target.closest('.test-game-type-btn')) {
                const gameType = e.target.closest('.test-game-type-btn').dataset.gameType;
                this.testGameType(gameType);
            }
        });
    }

    async loadTabContent(tab) {
        switch (tab) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'games':
                await this.loadGames();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'game-types':
                await this.loadGameTypes();
                break;
        }
    }

    async loadDashboard() {
        try {
            const [games, users, gameTypes] = await Promise.all([
                this.fetchAPI('/api/games'),
                this.fetchAPI('/api/users'), // Will implement this endpoint
                this.fetchAPI('/api/game-types')
            ]);

            document.getElementById('total-games').textContent = games.length || 0;
            document.getElementById('active-games').textContent = 
                games.filter(g => g.status === 'active').length || 0;
            document.getElementById('total-users').textContent = users?.length || 0;
            document.getElementById('total-game-types').textContent = Object.keys(gameTypes || {}).length;
        } catch (error) {
            console.error('Error loading dashboard:', error);
            // Set fallback values
            document.getElementById('total-games').textContent = '0';
            document.getElementById('active-games').textContent = '0';
            document.getElementById('total-users').textContent = '0';
            document.getElementById('total-game-types').textContent = '0';
        }
    }

    async loadGames() {
        try {
            const games = await this.fetchAPI('/api/games');
            const tbody = document.getElementById('games-table');
            
            if (games.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No games found</td></tr>';
                return;
            }

            tbody.innerHTML = games.map(game => `
                <tr>
                    <td>${game.id}</td>
                    <td><span class="badge bg-secondary">${game.gameType}</span></td>
                    <td><span class="badge bg-${this.getStatusColor(game.status)}">${game.status}</span></td>
                    <td>${game.players?.length || 0}/${game.maxPlayers || 'N/A'}</td>
                    <td>${new Date(game.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-game-btn" data-game-id="${game.id}">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary view-image-btn" data-game-id="${game.id}">
                            <i class="bi bi-image"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading games:', error);
            document.getElementById('games-table').innerHTML = 
                '<tr><td colspan="6" class="text-center text-danger">Error loading games</td></tr>';
        }
    }

    async loadUsers() {
        // For now, show placeholder since we need to implement the users list endpoint
        const tbody = document.getElementById('users-table');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Users endpoint not yet implemented</td></tr>';
    }

    async loadGameTypes() {
        try {
            const gameTypes = await this.fetchAPI('/api/game-types');
            const grid = document.getElementById('game-types-grid');
            
            if (!gameTypes || Object.keys(gameTypes).length === 0) {
                grid.innerHTML = '<div class="col-12 text-center">No game types found</div>';
                return;
            }

            grid.innerHTML = Object.entries(gameTypes).map(([type, info]) => `
                <div class="col-md-4 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${type}</h5>
                            <p class="card-text">
                                <strong>Players:</strong> ${info.minPlayers}-${info.maxPlayers}<br>
                                <strong>Description:</strong> ${info.description || 'No description available'}
                            </p>
                            <button class="btn btn-primary btn-sm test-game-type-btn" data-game-type="${type}">
                                Test Validation
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Also populate the create game dropdown
            const select = document.getElementById('gameType');
            select.innerHTML = '<option value="">Select a game type...</option>' +
                Object.keys(gameTypes).map(type => 
                    `<option value="${type}">${type}</option>`
                ).join('');
        } catch (error) {
            console.error('Error loading game types:', error);
            document.getElementById('game-types-grid').innerHTML = 
                '<div class="col-12 text-center text-danger">Error loading game types</div>';
        }
    }

    async createGame() {
        console.log('createGame function called');
        const gameType = document.getElementById('gameType').value;
        const gameName = document.getElementById('gameName').value;

        console.log('Game type:', gameType, 'Game name:', gameName);

        if (!gameType) {
            alert('Please select a game type');
            return;
        }

        try {
            const gameData = { 
                gameType,
                name: gameName || `${gameType} Game ${Date.now()}`,
                creatorId: 'admin' // Use admin as default creator for admin panel
            };

            console.log('Sending game data:', gameData);

            const response = await this.fetchAPI('/api/games', {
                method: 'POST',
                body: JSON.stringify(gameData)
            });

            console.log('Game created:', response);

            // Close modal and refresh games list
            const modal = document.getElementById('createGameModal');
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.getElementById('createGameForm').reset();
            
            // Switch to games tab and refresh
            document.querySelector('[href="#games"]').click();
            
            alert(`Game created successfully! ID: ${response.id}`);
        } catch (error) {
            console.error('Error creating game:', error);
            alert('Error creating game: ' + error.message);
        }
    }

    async viewGame(gameId) {
        try {
            const game = await this.fetchAPI(`/api/games/${gameId}`);
            
            // Create a modal to show game details
            const modalHtml = `
                <div class="modal fade" id="gameDetailModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Game Details - ${gameId}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Basic Info</h6>
                                        <p><strong>ID:</strong> ${game.id}</p>
                                        <p><strong>Name:</strong> ${game.name || 'Unnamed'}</p>
                                        <p><strong>Type:</strong> ${game.gameType}</p>
                                        <p><strong>Status:</strong> <span class="badge bg-${this.getStatusColor(game.status)}">${game.status}</span></p>
                                        <p><strong>Created:</strong> ${new Date(game.createdAt).toLocaleString()}</p>
                                        <p><strong>Players:</strong> ${game.players?.length || 0}/${game.maxPlayers}</p>
                                        <p><strong>Current Turn:</strong> ${game.currentPlayerId || 'N/A'}</p>
                                        <p><strong>Move Count:</strong> ${game.moveCount || 0}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Raw JSON</h6>
                                        <pre style="max-height: 300px; overflow-y: auto; font-size: 0.8rem;">${JSON.stringify(game, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('gameDetailModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal using Bootstrap's data attributes
            const modal = document.getElementById('gameDetailModal');
            modal.classList.add('show');
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'gameDetailBackdrop';
            document.body.appendChild(backdrop);
            
            // Close modal when clicking close button or backdrop
            const closeModal = () => {
                modal.classList.remove('show');
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                const backdrop = document.getElementById('gameDetailBackdrop');
                if (backdrop) backdrop.remove();
                modal.remove();
            };
            
            modal.querySelector('.btn-close').addEventListener('click', closeModal);
            modal.querySelector('[data-bs-dismiss="modal"]').addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);
            
        } catch (error) {
            alert('Error loading game details: ' + error.message);
        }
    }

    async viewGameImage(gameId) {
        try {
            const imageUrl = `${this.baseURL}/api/games/${gameId}/image`;
            // Test if the image endpoint works first
            const response = await fetch(imageUrl);
            if (response.ok) {
                window.open(imageUrl, '_blank');
            } else {
                alert('Error loading game image: ' + response.statusText);
            }
        } catch (error) {
            alert('Error loading game image: ' + error.message);
        }
    }

    async testGameType(type) {
        try {
            const result = await this.fetchAPI(`/api/game-types/${type}/validate`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            alert('Game type validation successful!');
        } catch (error) {
            alert('Game type validation failed: ' + error.message);
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

    handleGameUpdate(data) {
        // Refresh games if we're on the games tab
        const activeTab = document.querySelector('.list-group-item.active');
        if (activeTab && activeTab.getAttribute('href') === '#games') {
            this.loadGames();
        }
        
        // Update dashboard counters
        this.loadDashboard();
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

// Initialize the admin panel when the page loads
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});