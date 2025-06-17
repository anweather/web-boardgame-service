import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Badge, 
  Pagination, 
  Alert,
  Spinner,
  ButtonGroup
} from 'react-bootstrap';
import { Game, GameType } from '../../types';
import apiService from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

const GameManager: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [gamesPerPage, setGamesPerPage] = useState(25);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  
  // Create game form state
  const [newGameType, setNewGameType] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { on } = useSocket();

  useEffect(() => {
    loadGames();
    loadGameTypes();
  }, []);

  useEffect(() => {
    const cleanup = on('game-update', () => {
      loadGames();
    });
    return cleanup;
  }, [on]);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const gamesData = await apiService.getGames();
      setGames(gamesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      setError('Failed to load games');
      console.error('Error loading games:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGameTypes = async () => {
    try {
      const gameTypesData = await apiService.getGameTypes();
      setGameTypes(gameTypesData);
    } catch (err) {
      console.error('Error loading game types:', err);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameType) {
      alert('Please select a game type');
      return;
    }

    if (!user) {
      alert('You must be logged in to create a game');
      return;
    }

    try {
      setCreating(true);
      await apiService.createGame({
        gameType: newGameType,
        name: newGameName || `${newGameType} Game ${Date.now()}`,
        creatorId: user.id
      });
      
      setShowCreateModal(false);
      setNewGameType('');
      setNewGameName('');
      await loadGames();
      alert('Game created successfully!');
    } catch (err) {
      console.error('Error creating game:', err);
      alert('Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const viewGame = (game: Game) => {
    setSelectedGame(game);
    setShowGameModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'active': return 'success';
      case 'completed': return 'primary';
      default: return 'secondary';
    }
  };

  const formatGameType = (gameType: string) => {
    return gameType.charAt(0).toUpperCase() + gameType.slice(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(games.length / gamesPerPage);
  const startIndex = (currentPage - 1) * gamesPerPage;
  const endIndex = Math.min(startIndex + gamesPerPage, games.length);
  const currentGames = games.slice(startIndex, endIndex);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev" 
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(currentPage - 1)}
      />
    );

    // First page
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => setCurrentPage(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" />);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" />);
      }
      items.push(
        <Pagination.Item key={totalPages} onClick={() => setCurrentPage(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next 
        key="next" 
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(currentPage + 1)}
      />
    );

    return <Pagination>{items}</Pagination>;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <div>Loading games...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="bi bi-puzzle me-2"></i>
              Game Manager
            </h2>
            <div>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateModal(true)}
                className="me-2"
                disabled={!user}
                title={!user ? "You must be logged in to create games" : ""}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Game
              </Button>
              <Button variant="outline-secondary" onClick={loadGames}>
                <i className="bi bi-arrow-clockwise me-2"></i>
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}

      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">Games ({games.length})</h5>
            </Col>
            <Col xs="auto">
              <Form.Select
                size="sm"
                value={gamesPerPage}
                onChange={(e) => {
                  setGamesPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0">
          {games.length === 0 ? (
            <div className="text-center p-4">
              <i className="bi bi-puzzle display-1 text-muted"></i>
              <h4 className="mt-3">No games found</h4>
              <p className="text-muted">Create your first game to get started.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Game</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Players</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentGames.map(game => (
                  <tr key={game.id}>
                    <td>
                      <div className="fw-bold">{game.name || 'Unnamed Game'}</div>
                      <small className="text-muted">{game.id.substring(0, 8)}...</small>
                    </td>
                    <td>
                      <Badge bg="secondary">{formatGameType(game.gameType)}</Badge>
                    </td>
                    <td>
                      <Badge bg={getStatusColor(game.status)}>{game.status}</Badge>
                    </td>
                    <td>{(game.players || []).length}/{game.maxPlayers || 'N/A'}</td>
                    <td>
                      <div>{new Date(game.createdAt).toLocaleDateString()}</div>
                      <small className="text-muted">
                        {new Date(game.createdAt).toLocaleTimeString()}
                      </small>
                    </td>
                    <td>
                      <ButtonGroup size="sm">
                        <Button
                          variant="info"
                          onClick={() => viewGame(game)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => window.open(`/api/games/${game.id}/image`, '_blank')}
                          title="View Board"
                        >
                          <i className="bi bi-image"></i>
                        </Button>
                        <Button
                          variant="success"
                          href={`/game/${game.id}`}
                          target="_blank"
                          title="Play Game"
                        >
                          <i className="bi bi-play-fill"></i>
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
        {games.length > 0 && (
          <Card.Footer>
            <Row className="align-items-center">
              <Col>
                <small className="text-muted">
                  Showing {startIndex + 1} to {endIndex} of {games.length} entries
                </small>
              </Col>
              <Col xs="auto">
                {renderPagination()}
              </Col>
            </Row>
          </Card.Footer>
        )}
      </Card>

      {/* Create Game Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Game</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateGame}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Game Type *</Form.Label>
              <Form.Select
                value={newGameType}
                onChange={(e) => setNewGameType(e.target.value)}
                required
              >
                <option value="">Select a game type...</option>
                {gameTypes.map(gameType => (
                  <option key={gameType.type} value={gameType.type}>
                    {gameType.name || formatGameType(gameType.type)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Game Name</Form.Label>
              <Form.Control
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Leave empty for auto-generated name"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                'Create Game'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Game Details Modal */}
      <Modal show={showGameModal} onHide={() => setShowGameModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Game Details: {selectedGame?.name || 'Unnamed Game'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedGame && (
            <Row>
              <Col md={6}>
                <h6>Game Information</h6>
                <Table size="sm" borderless>
                  <tbody>
                    <tr>
                      <td><strong>ID:</strong></td>
                      <td><code>{selectedGame.id}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Type:</strong></td>
                      <td><Badge bg="secondary">{formatGameType(selectedGame.gameType)}</Badge></td>
                    </tr>
                    <tr>
                      <td><strong>Status:</strong></td>
                      <td><Badge bg={getStatusColor(selectedGame.status)}>{selectedGame.status}</Badge></td>
                    </tr>
                    <tr>
                      <td><strong>Players:</strong></td>
                      <td>{(selectedGame.players || []).length}/{selectedGame.maxPlayers || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Moves:</strong></td>
                      <td>{selectedGame.moveCount || 0}</td>
                    </tr>
                    <tr>
                      <td><strong>Created:</strong></td>
                      <td>{new Date(selectedGame.createdAt).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Players</h6>
                {(selectedGame.players || []).length === 0 ? (
                  <p className="text-muted">No players yet</p>
                ) : (
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Color</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedGame.players || []).map((player, index) => (
                        <tr key={player.userId}>
                          <td>{player.username}</td>
                          <td>{player.color || '-'}</td>
                          <td>{new Date(player.joinedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGameModal(false)}>
            Close
          </Button>
          {selectedGame && (
            <Button 
              variant="primary" 
              href={`/game/${selectedGame.id}`}
              target="_blank"
            >
              <i className="bi bi-play-fill me-2"></i>
              Play Game
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GameManager;