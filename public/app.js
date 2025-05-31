class AdminPanel {
    constructor() {
        this.baseURL = window.location.origin;
        this.socket = null;
        this.adminUserId = null;
        this.gamesCurrentPage = 1;
        this.gamesPerPage = 25;
        this.gamesTotal = 0;
        this.allGames = [];
        this.init();
    }

    async init() {
        this.initializeSocket();
        this.bindEventListeners();
        await this.getOrCreateAdminUser();
        await this.loadGameTypesForModal(); // Load game types for the modal dropdown
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

        // Games per page selector
        document.getElementById('gamesPerPage').addEventListener('change', (e) => {
            this.gamesPerPage = parseInt(e.target.value);
            this.gamesCurrentPage = 1; // Reset to first page
            this.renderGamesTable();
        });

        // Purge database button
        document.getElementById('purgeDataBtn').addEventListener('click', () => {
            this.purgeDatabase();
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

            // Handle pagination button clicks
            if (e.target.closest('.pagination-btn')) {
                const page = parseInt(e.target.closest('.pagination-btn').dataset.page);
                if (page && page !== this.gamesCurrentPage) {
                    this.gamesCurrentPage = page;
                    this.renderGamesTable();
                }
            }

            // Handle force start button clicks
            if (e.target.closest('.force-start-btn')) {
                const gameId = e.target.closest('.force-start-btn').dataset.gameId;
                this.forceStartGame(gameId);
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
            // Sort games by creation date, newest first
            this.allGames = games.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            this.gamesTotal = games.length;
            this.gamesCurrentPage = 1; // Reset to first page
            this.renderGamesTable();
        } catch (error) {
            console.error('Error loading games:', error);
            document.getElementById('games-table').innerHTML = 
                '<tr><td colspan="6" class="text-center text-danger">Error loading games</td></tr>';
            document.getElementById('games-info').textContent = '';
            document.getElementById('games-pagination').innerHTML = '';
        }
    }

    renderGamesTable() {
        const tbody = document.getElementById('games-table');
        const infoDiv = document.getElementById('games-info');
        const paginationDiv = document.getElementById('games-pagination');
        
        if (this.allGames.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No games found</td></tr>';
            infoDiv.textContent = '';
            paginationDiv.innerHTML = '';
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.gamesTotal / this.gamesPerPage);
        const startIndex = (this.gamesCurrentPage - 1) * this.gamesPerPage;
        const endIndex = Math.min(startIndex + this.gamesPerPage, this.gamesTotal);
        const currentGames = this.allGames.slice(startIndex, endIndex);

        // Update info
        infoDiv.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${this.gamesTotal} entries`;

        // Render table rows
        tbody.innerHTML = currentGames.map(game => `
            <tr>
                <td>
                    <div class="fw-bold">${game.name || 'Unnamed Game'}</div>
                    <small class="text-muted">${game.id.substring(0, 8)}...</small>
                </td>
                <td><span class="badge bg-secondary">${this.formatGameType(game.gameType)}</span></td>
                <td><span class="badge bg-${this.getStatusColor(game.status)}">${game.status}</span></td>
                <td>${game.players?.length || 0}/${game.maxPlayers || 'N/A'}</td>
                <td>
                    <div>${new Date(game.createdAt).toLocaleDateString()}</div>
                    <small class="text-muted">${new Date(game.createdAt).toLocaleTimeString()}</small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-info view-game-btn" data-game-id="${game.id}" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary view-image-btn" data-game-id="${game.id}" title="View Board">
                            <i class="bi bi-image"></i>
                        </button>
                        ${game.status === 'waiting' ? `
                        <button class="btn btn-sm btn-success force-start-btn" data-game-id="${game.id}" title="Force Start Game">
                            <i class="bi bi-play-fill"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // Render pagination
        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        const paginationDiv = document.getElementById('games-pagination');
        
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.gamesCurrentPage === 1 ? 'disabled' : ''}">
                <button class="page-link pagination-btn" data-page="${this.gamesCurrentPage - 1}" ${this.gamesCurrentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.gamesCurrentPage - 2);
        const endPage = Math.min(totalPages, this.gamesCurrentPage + 2);

        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link pagination-btn" data-page="1">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.gamesCurrentPage ? 'active' : ''}">
                    <button class="page-link pagination-btn" data-page="${i}">${i}</button>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link pagination-btn" data-page="${totalPages}">${totalPages}</button>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${this.gamesCurrentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link pagination-btn" data-page="${this.gamesCurrentPage + 1}" ${this.gamesCurrentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;

        paginationDiv.innerHTML = paginationHTML;
    }

    formatGameType(gameType) {
        const types = {
            'chess': 'Chess',
            'checkers': 'Checkers', 
            'hearts': 'Hearts'
        };
        return types[gameType] || gameType.charAt(0).toUpperCase() + gameType.slice(1);
    }

    async purgeDatabase() {
        const confirmation = confirm(
            'Are you sure you want to purge the database?\n\n' +
            'This will permanently delete:\n' +
            '• All games and game history\n' +
            '• All users (except admin)\n' +
            '• All notifications\n\n' +
            'This action cannot be undone!'
        );

        if (!confirmation) {
            return;
        }

        try {
            // Show loading state
            const purgeBtn = document.getElementById('purgeDataBtn');
            const originalText = purgeBtn.innerHTML;
            purgeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Purging...';
            purgeBtn.disabled = true;

            const response = await this.fetchAPI('/api/admin/purge', {
                method: 'POST'
            });

            console.log('Database purged:', response);
            
            // Refresh all data
            await Promise.all([
                this.loadDashboard(),
                this.loadGames(),
                this.loadUsers()
            ]);

            alert('Database purged successfully! All test data has been removed.');
        } catch (error) {
            console.error('Error purging database:', error);
            alert('Error purging database: ' + error.message);
        } finally {
            // Restore button state
            const purgeBtn = document.getElementById('purgeDataBtn');
            purgeBtn.innerHTML = '<i class="bi bi-trash"></i> Purge Database';
            purgeBtn.disabled = false;
        }
    }

    async loadUsers() {
        try {
            const users = await this.fetchAPI('/api/users');
            const tbody = document.getElementById('users-table');
            
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>${user.gamesPlayed || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-user-btn" data-user-id="${user.id}">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
            document.getElementById('users-table').innerHTML = 
                '<tr><td colspan="5" class="text-center text-danger">Error loading users</td></tr>';
        }
    }

    async loadGameTypesForModal() {
        try {
            const gameTypes = await this.fetchAPI('/api/game-types');
            const select = document.getElementById('gameType');
            
            if (!gameTypes || gameTypes.length === 0) {
                select.innerHTML = '<option value="">No game types available</option>';
                return;
            }

            select.innerHTML = '<option value="">Select a game type...</option>' +
                gameTypes.map(gameType => 
                    `<option value="${gameType.type}">${gameType.name || gameType.type}</option>`
                ).join('');
        } catch (error) {
            console.error('Error loading game types for modal:', error);
            const select = document.getElementById('gameType');
            select.innerHTML = '<option value="">Error loading game types</option>';
        }
    }

    async loadGameTypes() {
        try {
            const gameTypes = await this.fetchAPI('/api/game-types');
            const grid = document.getElementById('game-types-grid');
            
            if (!gameTypes || gameTypes.length === 0) {
                grid.innerHTML = '<div class="col-12 text-center">No game types found</div>';
                return;
            }

            grid.innerHTML = gameTypes.map(gameType => `
                <div class="col-md-4 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${gameType.name || gameType.type}</h5>
                            <p class="card-text">
                                <strong>Players:</strong> ${gameType.minPlayers}-${gameType.maxPlayers}<br>
                                <strong>Description:</strong> ${gameType.description || 'No description available'}
                            </p>
                            <button class="btn btn-primary btn-sm test-game-type-btn" data-game-type="${gameType.type}">
                                Test Validation
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Also populate the create game dropdown
            const select = document.getElementById('gameType');
            select.innerHTML = '<option value="">Select a game type...</option>' +
                gameTypes.map(gameType => 
                    `<option value="${gameType.type}">${gameType.name || gameType.type}</option>`
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
                creatorId: this.adminUserId // Use dynamic admin user ID
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
            
            // Switch to games tab and refresh games list
            document.querySelector('[href="#games"]').click();
            await this.loadGames(); // Refresh the games list
            
            alert(`Game "${response.name}" created successfully!`);
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
            
            // Use Bootstrap's Modal API
            const modalElement = document.getElementById('gameDetailModal');
            const modal = new bootstrap.Modal(modalElement);
            
            // Clean up when modal is hidden
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });
            
            modal.show();
            
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

    async forceStartGame(gameId) {
        const confirmation = confirm('Force start this game?\n\nThis will make the game active and set the first player\'s turn.');
        
        if (!confirmation) {
            return;
        }

        try {
            const response = await this.fetchAPI(`/api/games/${gameId}/force-start`, {
                method: 'POST'
            });
            
            console.log('Game force started:', response);
            alert(`Game started successfully!\nCurrent player: ${response.currentPlayerId}\nPlayers: ${response.playerCount}`);
            
            // Refresh the games list
            await this.loadGames();
            
        } catch (error) {
            console.error('Error force starting game:', error);
            alert('Error starting game: ' + error.message);
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

    async getOrCreateAdminUser() {
        try {
            // First, try to find existing admin user
            const users = await this.fetchAPI('/api/users');
            const adminUser = users.find(user => user.username === 'admin');
            
            if (adminUser) {
                this.adminUserId = adminUser.id;
                console.log('Found existing admin user:', adminUser.id);
                return;
            }

            // If no admin user exists, create one
            console.log('Creating admin user...');
            const newAdmin = await this.fetchAPI('/api/users/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: 'admin',
                    email: 'admin@admin.com',
                    password: 'admin123'
                })
            });
            
            this.adminUserId = newAdmin.user.id;
            console.log('Created new admin user:', this.adminUserId);
        } catch (error) {
            console.error('Error getting/creating admin user:', error);
            // Fallback to a default admin ID - this will fail gracefully if the user doesn't exist
            this.adminUserId = 'admin';
        }
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