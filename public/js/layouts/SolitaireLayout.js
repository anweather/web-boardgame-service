/**
 * Solitaire Game-Specific Layout
 * 
 * Provides a visual, interactive solitaire board layout with:
 * - Visual representation of all piles (foundation, tableau, stock, waste)
 * - Multi-card move support with visual selection
 * - Real-time game state updates
 * - Auto-move detection and suggestions
 */

class SolitaireLayout {
  constructor(gamePlayer) {
    console.log('SolitaireLayout constructor called');
    this.gamePlayer = gamePlayer;
    this.selectedPile = null;
    this.targetPile = null;
    this.currentBoardState = null;
    this.maxMovableCards = {};
    
    this.initializeLayout();
    this.bindEvents();
  }

  /**
   * Initialize the solitaire-specific layout
   */
  initializeLayout() {
    console.log('SolitaireLayout.initializeLayout called');
    const gamePlaySection = document.getElementById('game-play-section');
    if (!gamePlaySection) {
      console.log('Game play section not found');
      return;
    }

    // Create solitaire-specific layout
    const solitaireLayout = this.createSolitaireBoard();
    
    // Replace the generic board image with our interactive board
    const boardImageCard = gamePlaySection.querySelector('.card:has(#board-image)');
    if (boardImageCard) {
      console.log('Replacing board image card with solitaire layout');
      boardImageCard.innerHTML = solitaireLayout;
    } else {
      console.log('Board image card not found');
    }

    // Replace the move input with solitaire-specific controls
    this.createSolitaireControls();
    
    console.log('SolitaireLayout initialization complete');
  }

  /**
   * Create the visual solitaire board
   */
  createSolitaireBoard() {
    return `
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-suit-spade-fill"></i> Klondike Solitaire
          <button class="btn btn-sm btn-outline-secondary float-end d-none d-md-block" id="toggle-board-view">
            <i class="bi bi-grid-3x3"></i> Traditional View
          </button>
        </h6>
      </div>
      <div class="card-body p-3">
        <div class="solitaire-board">
          <!-- Desktop Layout -->
          <div class="desktop-layout d-none d-md-block">
            <!-- Top Row: Stock/Waste on left, Foundation piles on right -->
            <div class="top-row d-flex justify-content-between align-items-start mb-4">
              <!-- Stock and Waste (top left) -->
              <div class="stock-waste-area d-flex gap-3">
                ${this.createStockPile()}
                ${this.createWastePile()}
              </div>
              
              <!-- Foundation Piles (top right) -->
              <div class="foundation-area d-flex gap-2">
                ${this.createFoundationPile('hearts')}
                ${this.createFoundationPile('diamonds')}
                ${this.createFoundationPile('clubs')}
                ${this.createFoundationPile('spades')}
              </div>
            </div>
            
            <!-- Tableau Columns (7 columns across the middle) -->
            <div class="tableau-area">
              <div class="d-flex justify-content-center gap-2">
                ${Array.from({length: 7}, (_, i) => this.createTableauColumn(i)).join('')}
              </div>
            </div>
          </div>

          <!-- Mobile Layout -->
          <div class="mobile-layout d-block d-md-none">
            <!-- Foundation Piles (top row on mobile) -->
            <div class="foundation-area d-flex justify-content-center gap-1 mb-3">
              ${this.createFoundationPile('hearts')}
              ${this.createFoundationPile('diamonds')}
              ${this.createFoundationPile('clubs')}
              ${this.createFoundationPile('spades')}
            </div>
            
            <!-- Stock and Waste (second row on mobile) -->
            <div class="stock-waste-area d-flex justify-content-center gap-3 mb-3">
              ${this.createStockPile()}
              ${this.createWastePile()}
            </div>
            
            <!-- Tableau Columns (scrollable on mobile) -->
            <div class="tableau-area">
              <div class="tableau-scroll d-flex gap-1" style="overflow-x: auto; padding: 0 5px;">
                ${Array.from({length: 7}, (_, i) => this.createTableauColumn(i)).join('')}
              </div>
            </div>
          </div>
          
          <!-- Multi-Card Move Controls (hidden by default) -->
          <div class="multi-card-controls mt-3" id="multi-card-controls" style="display: none;">
            <div class="card bg-light">
              <div class="card-header py-2">
                <h6 class="mb-0">
                  <i class="bi bi-stack"></i> Multi-Card Move
                  <button class="btn btn-sm btn-outline-secondary float-end" id="cancel-multi-move">
                    <i class="bi bi-x"></i>
                  </button>
                </h6>
              </div>
              <div class="card-body">
                <div class="move-preview mb-3" id="move-preview">
                  <!-- Dynamic content -->
                </div>
                
                <div class="card-slider mb-3" id="card-slider-container">
                  <label for="card-count-slider" class="form-label">
                    Cards to move: <span id="card-count-display">1</span>
                  </label>
                  <input type="range" class="form-range" id="card-count-slider" 
                         min="1" max="1" value="1" step="1">
                  <div class="d-flex justify-content-between">
                    <small class="text-muted">Single card</small>
                    <small class="text-muted" id="max-cards-label">Single card</small>
                  </div>
                </div>
                
                <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button class="btn btn-outline-secondary" id="cancel-move-btn">Cancel</button>
                  <button class="btn btn-success" id="confirm-move-btn">
                    <i class="bi bi-arrow-right"></i> Move 1 card
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          .solitaire-board {
            background: linear-gradient(135deg, #0d4d2b, #1a6b3a);
            border-radius: 12px;
            padding: 25px;
            box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);
            min-height: 500px;
          }
          
          /* Card dimensions */
          .card-slot {
            width: 75px;
            height: 105px;
            border-radius: 8px;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          /* Empty slot styling */
          .empty-slot {
            width: 100%;
            height: 100%;
            border: 2px dashed rgba(255,255,255,0.3);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            font-weight: bold;
            background: rgba(255,255,255,0.05);
          }
          
          .empty-tableau {
            height: 120px; /* Taller for tableau columns */
          }
          
          /* Card back styling for stock */
          .card-back {
            width: 100%;
            height: 100%;
            background: linear-gradient(45deg, #0066cc, #004499);
            border: 2px solid #003366;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            position: relative;
            overflow: hidden;
          }
          
          .card-back::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              45deg,
              transparent,
              transparent 3px,
              rgba(255,255,255,0.1) 3px,
              rgba(255,255,255,0.1) 6px
            );
          }
          
          /* Playing card styling */
          .playing-card {
            width: 75px;
            height: 105px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            position: absolute;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.2s ease;
          }
          
          .playing-card.face-down {
            background: linear-gradient(45deg, #0066cc, #004499);
            color: white;
          }
          
          .playing-card.red {
            color: #d63384;
          }
          
          .playing-card.black {
            color: #212529;
          }
          
          .playing-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 10;
          }
          
          /* Foundation piles */
          .foundation-pile {
            position: relative;
          }
          
          .foundation-pile .card-slot {
            background: rgba(255,255,255,0.1);
          }
          
          .foundation-pile .empty-slot {
            font-size: 24px;
            border-style: solid;
          }
          
          /* Stock and waste piles */
          .stock-pile, .waste-pile {
            text-align: center;
          }
          
          .pile-label {
            display: block;
            color: white;
            margin-top: 8px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          }
          
          /* Tableau columns */
          .tableau-column {
            min-height: 200px;
            position: relative;
          }
          
          .tableau-cards {
            position: relative;
            min-height: 120px;
          }
          
          .tableau-cards .playing-card {
            margin-top: -85px; /* Overlap cards */
          }
          
          .tableau-cards .playing-card:first-child {
            margin-top: 0;
          }
          
          /* Selection states */
          .selected {
            box-shadow: 0 0 0 3px #ffd700, 0 0 15px rgba(255,215,0,0.5) !important;
            transform: translateY(-2px) !important;
            z-index: 20 !important;
          }
          
          .valid-target {
            box-shadow: 0 0 0 3px #28a745, 0 0 15px rgba(40,167,69,0.5) !important;
            animation: pulse-green 1.5s infinite;
          }
          
          .invalid-target {
            box-shadow: 0 0 0 3px #dc3545, 0 0 15px rgba(220,53,69,0.3) !important;
            cursor: not-allowed !important;
          }
          
          @keyframes pulse-green {
            0%, 100% { box-shadow: 0 0 0 3px #28a745, 0 0 15px rgba(40,167,69,0.3); }
            50% { box-shadow: 0 0 0 3px #28a745, 0 0 20px rgba(40,167,69,0.8); }
          }
          
          /* Multi-card selection */
          .multi-select {
            background: rgba(255,215,0,0.2) !important;
            border: 2px solid #ffd700 !important;
          }
          
          /* Move preview */
          .move-preview {
            background: #e3f2fd;
            border: 1px solid #90caf9;
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
          }
          
          .sequence-preview {
            font-family: monospace;
            background: rgba(0,0,0,0.1);
            padding: 4px 8px;
            border-radius: 4px;
            margin: 5px 0;
          }
          
          /* Mobile-specific styles */
          .mobile-layout .tableau-scroll {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
          }
          
          .mobile-layout .tableau-scroll::-webkit-scrollbar {
            height: 8px;
          }
          
          .mobile-layout .tableau-scroll::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
          }
          
          .mobile-layout .tableau-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.3);
            border-radius: 4px;
          }
          
          /* Touch-friendly targets */
          @media (max-width: 768px) {
            .card-slot, .playing-card {
              min-height: 44px; /* iOS recommended touch target */
            }
          }

          /* Responsive design */
          @media (max-width: 768px) {
            .solitaire-board {
              padding: 10px;
              min-height: 400px;
            }
            
            .card-slot, .playing-card {
              width: 45px;
              height: 63px;
              font-size: 10px;
            }
            
            .playing-card div:nth-child(2) {
              font-size: 16px !important; /* Suit symbol */
            }
            
            .tableau-cards .playing-card {
              margin-top: -50px;
            }
            
            .top-row {
              flex-direction: column;
              gap: 15px;
              align-items: center;
              margin-bottom: 20px;
            }
            
            .foundation-area {
              order: 1;
              gap: 8px;
            }
            
            .stock-waste-area {
              order: 2;
              gap: 15px;
            }
            
            .tableau-area .d-flex {
              gap: 3px;
              justify-content: center;
              flex-wrap: nowrap;
              overflow-x: auto;
              padding: 0 5px;
            }
            
            .tableau-column {
              min-height: 150px;
              flex-shrink: 0;
            }
            
            .pile-label {
              font-size: 10px;
              margin-top: 4px;
            }
            
            .empty-slot {
              font-size: 8px;
            }
            
            .foundation-pile .empty-slot {
              font-size: 16px;
            }
          }
          
          @media (max-width: 480px) {
            .solitaire-board {
              padding: 8px;
            }
            
            .card-slot, .playing-card {
              width: 38px;
              height: 53px;
              font-size: 8px;
            }
            
            .playing-card div:nth-child(2) {
              font-size: 14px !important; /* Suit symbol */
            }
            
            .tableau-cards .playing-card {
              margin-top: -42px;
            }
            
            .top-row {
              gap: 10px;
              margin-bottom: 15px;
            }
            
            .foundation-area {
              gap: 4px;
            }
            
            .stock-waste-area {
              gap: 10px;
            }
            
            .tableau-area .d-flex {
              gap: 2px;
              padding: 0 2px;
            }
            
            .tableau-column {
              min-height: 120px;
            }
            
            .pile-label {
              font-size: 9px;
              margin-top: 3px;
            }
            
            .empty-slot {
              font-size: 7px;
            }
            
            .foundation-pile .empty-slot {
              font-size: 14px;
            }
            
            .multi-card-controls {
              margin-top: 10px;
            }
            
            .multi-card-controls .card {
              font-size: 12px;
            }
          }
        </style>
      </div>
    `;
  }

  /**
   * Create foundation pile HTML
   */
  createFoundationPile(suit) {
    const suitIcons = {
      hearts: 'bi-suit-heart-fill',
      diamonds: 'bi-suit-diamond-fill', 
      clubs: 'bi-suit-club-fill',
      spades: 'bi-suit-spade-fill'
    };
    
    const suitColors = {
      hearts: '#d63384',
      diamonds: '#d63384',
      clubs: '#212529',
      spades: '#212529'
    };
    
    return `
      <div class="foundation-pile" 
           data-pile="foundation" 
           data-suit="${suit}"
           title="Foundation: ${suit.charAt(0).toUpperCase() + suit.slice(1)}">
        <div class="card-slot">
          <i class="bi ${suitIcons[suit]}" style="color: ${suitColors[suit]}"></i>
        </div>
        <div class="foundation-cards" id="foundation-${suit}">
          <!-- Cards will be added here dynamically -->
        </div>
      </div>
    `;
  }

  /**
   * Create stock pile HTML
   */
  createStockPile() {
    return `
      <div class="stock-pile" 
           data-pile="stock"
           title="Stock pile - Click to draw cards">
        <div class="card-slot" id="stock-slot">
          <div class="card-back"></div>
        </div>
        <small class="pile-label">Stock</small>
      </div>
    `;
  }

  /**
   * Create waste pile HTML
   */
  createWastePile() {
    return `
      <div class="waste-pile" 
           data-pile="waste"
           title="Waste pile - Cards drawn from stock">
        <div class="card-slot" id="waste-slot">
          <div class="empty-slot">Waste</div>
        </div>
        <small class="pile-label">Waste</small>
      </div>
    `;
  }

  /**
   * Create tableau column HTML
   */
  createTableauColumn(column) {
    return `
      <div class="tableau-column" 
           data-pile="tableau" 
           data-column="${column}"
           title="Tableau column ${column + 1}">
        <div class="card-slot empty-tableau">
          <div class="empty-slot">${column + 1}</div>
        </div>
        <div class="tableau-cards" id="tableau-${column}">
          <!-- Cards will be stacked here -->
        </div>
      </div>
    `;
  }

  /**
   * Create solitaire-specific control panel
   */
  createSolitaireControls() {
    const controlsCard = document.querySelector('#gui-move-input').closest('.card');
    if (!controlsCard) return;

    controlsCard.innerHTML = `
      <div class="card-header">
        <h6 class="mb-0"><i class="bi bi-controller"></i> Solitaire Controls</h6>
      </div>
      <div class="card-body">
        <!-- Mobile-optimized layout -->
        <div class="mobile-controls d-block d-md-none">
          <!-- Essential actions for mobile -->
          <div class="d-grid gap-2 mb-3">
            <button class="btn btn-primary btn-lg" id="quick-draw">
              <i class="bi bi-plus-circle"></i> Draw Cards
            </button>
            <button class="btn btn-secondary" id="quick-reset" disabled>
              <i class="bi bi-arrow-clockwise"></i> Reset Stock
            </button>
          </div>
          
          <!-- Manual input for mobile -->
          <div class="input-group mb-3">
            <input type="text" class="form-control" id="manual-move-input" placeholder="d, wh, 1-7">
            <button class="btn btn-outline-primary" id="manual-move-btn">
              <i class="bi bi-send"></i>
            </button>
          </div>
          
          <!-- Compact game info -->
          <div class="bg-light rounded p-2">
            <div class="d-flex justify-content-around text-center">
              <div>
                <div class="h6 text-primary mb-0" id="game-score-mobile">0</div>
                <small class="text-muted">Score</small>
              </div>
              <div>
                <div class="h6 text-success mb-0" id="game-moves-mobile">0</div>
                <small class="text-muted">Moves</small>
              </div>
              <div>
                <div class="h6 text-info mb-0" id="game-time-mobile">0:00</div>
                <small class="text-muted">Time</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop layout -->
        <div class="desktop-controls d-none d-md-block">
          <!-- Quick Actions -->
          <div class="mb-3">
            <h6 class="text-muted mb-2">Stock Actions</h6>
            <div class="d-grid gap-2">
              <button class="btn btn-primary" id="quick-draw">
                <i class="bi bi-plus-circle"></i> Draw Cards
              </button>
              <button class="btn btn-secondary" id="quick-reset" disabled>
                <i class="bi bi-arrow-clockwise"></i> Reset Stock
              </button>
            </div>
          </div>

          <!-- Auto Foundation Moves -->
          <div class="mb-3">
            <h6 class="text-muted mb-2">Move to Foundation</h6>
            <div class="d-grid gap-2 d-md-block">
              <button class="btn btn-outline-danger btn-sm me-1 mb-2" data-auto-foundation="hearts" title="Auto-move to Hearts">
                <i class="bi bi-suit-heart-fill"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm me-1 mb-2" data-auto-foundation="diamonds" title="Auto-move to Diamonds">
                <i class="bi bi-suit-diamond-fill"></i>
              </button>
              <button class="btn btn-outline-dark btn-sm me-1 mb-2" data-auto-foundation="clubs" title="Auto-move to Clubs">
                <i class="bi bi-suit-club-fill"></i>
              </button>
              <button class="btn btn-outline-dark btn-sm mb-2" data-auto-foundation="spades" title="Auto-move to Spades">
                <i class="bi bi-suit-spade-fill"></i>
              </button>
            </div>
            <small class="text-muted">Click to auto-move available cards to foundation</small>
          </div>

          <!-- Manual Move Fallback -->
          <div class="mb-3">
            <h6 class="text-muted mb-2">Manual Move</h6>
            <div class="input-group input-group-sm">
              <input type="text" class="form-control" id="manual-move-input" placeholder="e.g., d, wh, 1-7">
              <button class="btn btn-outline-primary" id="manual-move-btn">
                <i class="bi bi-send"></i>
              </button>
            </div>
            <small class="text-muted">Use text commands if visual interface fails</small>
          </div>

          <!-- Game Info -->
          <div class="bg-light rounded p-2">
            <div class="row text-center">
              <div class="col-4">
                <div class="h6 text-primary mb-0" id="game-score">0</div>
                <small class="text-muted">Score</small>
              </div>
              <div class="col-4">
                <div class="h6 text-success mb-0" id="game-moves">0</div>
                <small class="text-muted">Moves</small>
              </div>
              <div class="col-4">
                <div class="h6 text-info mb-0" id="game-time">0:00</div>
                <small class="text-muted">Time</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Use event delegation since elements are created dynamically
    document.addEventListener('click', (e) => {
      // Handle pile clicks (foundation, stock, waste, tableau)
      if (e.target.closest('.foundation-pile, .stock-pile, .waste-pile, .tableau-column')) {
        this.handlePileClick(e.target.closest('.foundation-pile, .stock-pile, .waste-pile, .tableau-column'));
      }
      // Handle individual card clicks
      else if (e.target.closest('.playing-card')) {
        this.handleCardClick(e.target.closest('.playing-card'));
      } else if (e.target.id === 'quick-draw') {
        this.performMove('d');
      } else if (e.target.id === 'quick-reset') {
        this.performMove('r');
      } else if (e.target.id === 'manual-move-btn') {
        this.handleManualMove();
      } else if (e.target.closest('[data-auto-foundation]')) {
        this.handleAutoFoundation(e.target.closest('[data-auto-foundation]').dataset.autoFoundation);
      } else if (e.target.id === 'cancel-multi-move' || e.target.id === 'cancel-move-btn') {
        this.cancelMove();
      } else if (e.target.id === 'confirm-move-btn') {
        this.confirmMove();
      } else if (e.target.id === 'toggle-board-view') {
        this.toggleBoardView();
      }
    });

    // Slider interaction
    document.addEventListener('input', (e) => {
      if (e.target.id === 'card-count-slider') {
        this.updateCardCountDisplay(e.target.value);
      }
    });

    // Manual move on Enter
    document.addEventListener('keypress', (e) => {
      if (e.target.id === 'manual-move-input' && e.key === 'Enter') {
        this.handleManualMove();
      }
    });
  }

  /**
   * Handle pile click for selection and moves
   */
  handlePileClick(pile) {
    if (!this.currentBoardState) return;

    // Special handling for stock pile - always draw
    if (pile.classList.contains('stock-pile')) {
      this.performMove('d');
      return;
    }

    if (this.selectedPile) {
      // Second click - attempt move
      this.targetPile = pile;
      
      if (this.selectedPile === pile) {
        // Clicked same pile - deselect
        this.cancelMove();
        return;
      }
      
      this.attemptMove();
    } else {
      // First click - select source
      this.selectPile(pile);
    }
  }

  /**
   * Handle individual card clicks
   */
  handleCardClick(card) {
    if (!this.currentBoardState) return;

    // Get the pile this card belongs to
    const pile = card.closest('.foundation-pile, .waste-pile, .tableau-column');
    if (pile) {
      this.handlePileClick(pile);
    }
  }

  /**
   * Select a pile as the source
   */
  selectPile(pile) {
    this.clearSelection();
    this.selectedPile = pile;
    pile.classList.add('selected');
    
    // Show valid targets and calculate movable cards
    this.showValidTargets();
    this.calculateMovableCards();
  }

  /**
   * Show valid target piles
   */
  showValidTargets() {
    if (!this.selectedPile || !this.currentBoardState) return;

    const allPiles = document.querySelectorAll('.foundation-pile, .stock-pile, .waste-pile, .tableau-column');
    
    allPiles.forEach(pile => {
      if (pile === this.selectedPile) return;
      
      if (this.isValidTarget(this.selectedPile, pile)) {
        pile.classList.add('valid-target');
      } else {
        pile.classList.add('invalid-target');
      }
    });
  }

  /**
   * Check if a pile is a valid target for the selected pile
   */
  isValidTarget(source, target) {
    // Get pile types from classes and data attributes
    const sourcePile = this.getPileType(source);
    const targetPile = this.getPileType(target);
    
    if (sourcePile === 'tableau' && targetPile === 'tableau') {
      return source.dataset.column !== target.dataset.column;
    }
    if (sourcePile === 'waste' && targetPile === 'foundation') {
      return true;
    }
    if (sourcePile === 'tableau' && targetPile === 'foundation') {
      return true;
    }
    if (sourcePile === 'stock') {
      return false; // Stock can only be drawn, not moved
    }
    return false;
  }

  /**
   * Get pile type from element
   */
  getPileType(element) {
    if (element.classList.contains('foundation-pile')) return 'foundation';
    if (element.classList.contains('stock-pile')) return 'stock';
    if (element.classList.contains('waste-pile')) return 'waste';
    if (element.classList.contains('tableau-column')) return 'tableau';
    return element.dataset.pile || 'unknown';
  }

  /**
   * Calculate and display movable cards for tableau piles
   */
  calculateMovableCards() {
    if (!this.selectedPile || !this.selectedPile.classList.contains('tableau-column')) return;
    
    const column = parseInt(this.selectedPile.dataset.column);
    
    // In a real implementation, you'd call the backend to get max movable cards
    // For now, use cached data or make an API call
    this.getMaxMovableCards(column).then(maxCards => {
      this.maxMovableCards[column] = maxCards;
      
      if (maxCards > 1) {
        // Enable multi-card controls for tableau moves
        this.selectedPile.setAttribute('data-max-movable', maxCards);
      }
    });
  }

  /**
   * Attempt to move from selected pile to target pile
   */
  attemptMove() {
    if (!this.selectedPile || !this.targetPile) return;

    const sourceType = this.getPileType(this.selectedPile);
    const targetType = this.getPileType(this.targetPile);
    
    // Special handling for multi-card tableau moves
    if (sourceType === 'tableau' && targetType === 'tableau') {
      const maxMovable = this.maxMovableCards[this.selectedPile.dataset.column] || 1;
      
      if (maxMovable > 1) {
        this.showMultiCardControls(maxMovable);
        return;
      }
    }
    
    // Single card move
    this.performSingleMove();
  }

  /**
   * Show multi-card move controls
   */
  showMultiCardControls(maxCards) {
    const controls = document.getElementById('multi-card-controls');
    if (!controls) return;

    // Update preview
    this.updateMovePreview(maxCards);
    
    // Configure slider
    const slider = document.getElementById('card-count-slider');
    slider.max = maxCards;
    slider.value = maxCards; // Default to moving all available cards
    
    const maxLabel = document.getElementById('max-cards-label');
    maxLabel.textContent = `${maxCards} cards`;
    
    this.updateCardCountDisplay(maxCards);
    
    // Show controls
    controls.style.display = 'block';
    controls.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Update move preview
   */
  updateMovePreview(maxCards) {
    const preview = document.getElementById('move-preview');
    if (!preview) return;

    const sourceCol = parseInt(this.selectedPile.dataset.column) + 1;
    const targetCol = parseInt(this.targetPile.dataset.column) + 1;
    
    preview.innerHTML = `
      <div>
        <strong>Move from Column ${sourceCol} to Column ${targetCol}</strong>
      </div>
      <div class="sequence-preview mt-2">
        <small class="text-muted">Available sequence: ${maxCards} card${maxCards > 1 ? 's' : ''} can be moved together</small>
      </div>
      <div class="mt-2">
        <small class="text-info">
          <i class="bi bi-info-circle"></i> 
          Adjust the slider to choose how many cards to move
        </small>
      </div>
    `;
  }

  /**
   * Update card count display
   */
  updateCardCountDisplay(count) {
    const display = document.getElementById('card-count-display');
    const confirmBtn = document.getElementById('confirm-move-btn');
    
    if (display) display.textContent = count;
    if (confirmBtn) {
      confirmBtn.innerHTML = `<i class="bi bi-arrow-right"></i> Move ${count} card${count > 1 ? 's' : ''}`;
    }
  }

  /**
   * Perform single card move
   */
  performSingleMove() {
    const move = this.constructMoveCommand(1);
    this.performMove(move);
  }

  /**
   * Confirm multi-card move
   */
  confirmMove() {
    const slider = document.getElementById('card-count-slider');
    const cardCount = slider ? parseInt(slider.value) : 1;
    
    const move = this.constructMoveCommand(cardCount);
    this.performMove(move);
  }

  /**
   * Construct move command from selected piles
   */
  constructMoveCommand(cardCount = 1) {
    if (!this.selectedPile || !this.targetPile) return null;

    const sourcePile = this.getPileType(this.selectedPile);
    const targetPile = this.getPileType(this.targetPile);
    
    if (sourcePile === 'tableau' && targetPile === 'tableau') {
      const fromCol = parseInt(this.selectedPile.dataset.column) + 1;
      const toCol = parseInt(this.targetPile.dataset.column) + 1;
      return cardCount > 1 ? `${fromCol}-${toCol} x${cardCount}` : `${fromCol}-${toCol}`;
    }
    
    if (sourcePile === 'waste' && targetPile === 'foundation') {
      const suit = this.targetPile.dataset.suit;
      return `w${suit[0]}`;
    }
    
    if (sourcePile === 'tableau' && targetPile === 'foundation') {
      const col = parseInt(this.selectedPile.dataset.column) + 1;
      const suit = this.targetPile.dataset.suit;
      return `${col}${suit[0]}`;
    }
    
    if (sourcePile === 'stock') {
      return 'd'; // Draw command
    }
    
    return null;
  }

  /**
   * Perform move using game player
   */
  async performMove(moveCommand) {
    if (!moveCommand) return;
    
    try {
      // Use the existing game player move submission
      if (this.gamePlayer.currentInputMode === 'gui') {
        this.gamePlayer.selectedMove = moveCommand;
        await this.gamePlayer.submitGUIMove();
      } else {
        // Fallback to manual input
        const input = document.getElementById('manual-move-input');
        if (input) {
          input.value = moveCommand;
          await this.gamePlayer.submitMove();
        }
      }
      
      this.cancelMove();
    } catch (error) {
      console.error('Move failed:', error);
      // The error will be handled by the existing error display system
    }
  }

  /**
   * Handle manual move input
   */
  handleManualMove() {
    const input = document.getElementById('manual-move-input');
    if (!input || !input.value.trim()) return;
    
    this.performMove(input.value.trim());
    input.value = '';
  }

  /**
   * Handle auto-foundation moves
   */
  handleAutoFoundation(suit) {
    // Try to find available cards that can move to this foundation
    this.performMove(`w${suit[0]}`); // Try waste first
  }

  /**
   * Cancel current move selection
   */
  cancelMove() {
    this.clearSelection();
    
    const controls = document.getElementById('multi-card-controls');
    if (controls) controls.style.display = 'none';
  }

  /**
   * Clear pile selection
   */
  clearSelection() {
    const allPiles = document.querySelectorAll('.foundation-pile, .stock-pile, .waste-pile, .tableau-column');
    allPiles.forEach(pile => {
      pile.classList.remove('selected', 'valid-target', 'invalid-target');
    });
    
    const allCards = document.querySelectorAll('.playing-card');
    allCards.forEach(card => {
      card.classList.remove('selected', 'valid-target', 'invalid-target', 'multi-select');
    });
    
    this.selectedPile = null;
    this.targetPile = null;
  }

  /**
   * Toggle between visual and traditional board view
   */
  toggleBoardView() {
    // This would toggle between the visual layout and the traditional board image
    // For now, just show a message
    alert('Traditional board view - would switch to the SVG board image');
  }

  /**
   * Update the visual board with current game state
   */
  updateBoardState(boardState) {
    console.log('SolitaireLayout.updateBoardState called with:', boardState);
    this.currentBoardState = boardState;
    
    if (!boardState) {
      console.log('No boardState provided');
      return;
    }
    
    // Update foundation piles
    ['hearts', 'diamonds', 'clubs', 'spades'].forEach(suit => {
      if (boardState.foundation && boardState.foundation[suit]) {
        this.updateFoundationPile(suit, boardState.foundation[suit]);
      }
    });
    
    // Update stock pile
    if (boardState.stock) {
      this.updateStockPile(boardState.stock);
    }
    
    // Update waste pile
    if (boardState.waste) {
      this.updateWastePile(boardState.waste);
    }
    
    // Update tableau columns
    if (boardState.tableau) {
      boardState.tableau.forEach((column, index) => {
        this.updateTableauColumn(index, column);
      });
    }
    
    // Update game info
    this.updateGameInfo(boardState);
    
    // Update control states
    this.updateControlStates(boardState);
  }

  /**
   * Create a playing card element
   */
  createPlayingCard(card, index = 0) {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    };
    
    const rankDisplay = {
      'Ace': 'A',
      'Jack': 'J',
      'Queen': 'Q',
      'King': 'K'
    };
    
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const colorClass = isRed ? 'red' : 'black';
    const rank = rankDisplay[card.rank] || card.rank;
    
    if (!card.faceUp) {
      return `
        <div class="playing-card face-down" style="z-index: ${index};" 
             data-rank="${card.rank}" data-suit="${card.suit}" data-face-up="false">
          <div style="font-size: 10px;">🂠</div>
        </div>
      `;
    }
    
    return `
      <div class="playing-card ${colorClass}" style="z-index: ${index};" 
           data-rank="${card.rank}" data-suit="${card.suit}" data-face-up="true">
        <div style="font-size: 12px;">${rank}</div>
        <div style="font-size: 24px;">${suitSymbols[card.suit]}</div>
        <div style="transform: rotate(180deg); font-size: 10px;">${rank}</div>
      </div>
    `;
  }

  /**
   * Update foundation pile display
   */
  updateFoundationPile(suit, cards) {
    console.log(`Updating foundation ${suit} with ${cards.length} cards:`, cards);
    const container = document.getElementById(`foundation-${suit}`);
    if (!container) {
      console.log(`Foundation container not found: foundation-${suit}`);
      return;
    }
    
    if (cards.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    // Show only the top card
    const topCard = cards[cards.length - 1];
    console.log(`Top card for ${suit}:`, topCard);
    container.innerHTML = this.createPlayingCard(topCard);
  }

  /**
   * Update stock pile display
   */
  updateStockPile(cards) {
    console.log(`Updating stock pile with ${cards.length} cards:`, cards);
    const stockSlot = document.getElementById('stock-slot');
    if (!stockSlot) {
      console.log('Stock slot not found');
      return;
    }
    
    if (cards.length === 0) {
      stockSlot.innerHTML = '<div class="empty-slot">Empty</div>';
    } else {
      stockSlot.innerHTML = '<div class="card-back"></div>';
    }
  }

  /**
   * Update waste pile display
   */
  updateWastePile(cards) {
    console.log(`Updating waste pile with ${cards.length} cards:`, cards);
    const wasteSlot = document.getElementById('waste-slot');
    if (!wasteSlot) {
      console.log('Waste slot not found');
      return;
    }
    
    if (cards.length === 0) {
      wasteSlot.innerHTML = '<div class="empty-slot">Waste</div>';
    } else {
      const topCard = cards[cards.length - 1];
      console.log('Top waste card:', topCard);
      wasteSlot.innerHTML = this.createPlayingCard(topCard);
    }
  }

  /**
   * Update tableau column display
   */
  updateTableauColumn(columnIndex, cards) {
    console.log(`Updating tableau column ${columnIndex} with ${cards.length} cards:`, cards);
    const container = document.getElementById(`tableau-${columnIndex}`);
    if (!container) {
      console.log(`Tableau container not found: tableau-${columnIndex}`);
      return;
    }
    
    if (cards.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    // Render all cards in the column with proper stacking
    let html = '';
    cards.forEach((card, index) => {
      html += this.createPlayingCard(card, index);
    });
    
    console.log(`Generated HTML for tableau ${columnIndex}:`, html.substring(0, 100) + '...');
    container.innerHTML = html;
  }

  /**
   * Update tableau pile display with card count and movable indicator
   */
  updateTableauDisplay(pile, column) {
    const count = column.length;
    this.updatePileDisplay(pile, count);
    
    // Calculate and show movable cards
    if (count > 0) {
      const columnIndex = parseInt(pile.dataset.column);
      this.getMaxMovableCards(columnIndex).then(movableCount => {
        const indicator = pile.querySelector('.movable-indicator');
        if (indicator && movableCount > 1) {
          indicator.textContent = movableCount;
          indicator.style.display = 'flex';
        } else if (indicator) {
          indicator.style.display = 'none';
        }
      });
    }
  }

  /**
   * Update game information display
   */
  updateGameInfo(boardState) {
    // Update both desktop and mobile versions
    const scoreElements = [document.getElementById('game-score'), document.getElementById('game-score-mobile')];
    const movesElements = [document.getElementById('game-moves'), document.getElementById('game-moves-mobile')];
    const timeElements = [document.getElementById('game-time'), document.getElementById('game-time-mobile')];
    
    const score = boardState.score?.points || 0;
    const moves = boardState.moves?.length || 0;
    
    scoreElements.forEach(el => {
      if (el) el.textContent = score;
    });
    
    movesElements.forEach(el => {
      if (el) el.textContent = moves;
    });
    
    if (boardState.score?.timeStarted) {
      const elapsed = Date.now() - boardState.score.timeStarted;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      timeElements.forEach(el => {
        if (el) el.textContent = timeText;
      });
    }
  }

  /**
   * Update control button states
   */
  updateControlStates(boardState) {
    const resetBtn = document.getElementById('quick-reset');
    if (resetBtn) {
      // Enable reset only if stock is empty and waste has cards
      const canReset = boardState.stock && boardState.stock.length === 0 && 
                      boardState.waste && boardState.waste.length > 0;
      resetBtn.disabled = !canReset;
    }
  }

  /**
   * Get maximum movable cards for a tableau column
   */
  async getMaxMovableCards(column) {
    // In a real implementation, this would call the backend API
    // For now, return a mock value
    return Math.floor(Math.random() * 3) + 1;
  }

  /**
   * Destroy the layout (cleanup)
   */
  destroy() {
    // Remove event listeners and clean up
    this.clearSelection();
  }
}

// Export for use in the main game player
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SolitaireLayout;
} else {
  window.SolitaireLayout = SolitaireLayout;
}