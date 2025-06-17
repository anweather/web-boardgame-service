import React from 'react';
import { Container, Row, Col, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useGames } from '../../hooks/useGame';
import { useAuth } from '../../contexts/AuthContext';
import GameCard from './GameCard';

const GameList: React.FC = () => {
  const { games, loading, error, loadGames } = useGames();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleJoinGame = async (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3" />
          <div>Loading games...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Games</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={loadGames}>
              Try Again
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  // Filter games to show joinable ones
  const availableGames = games.filter(game => 
    game.status === 'waiting' || 
    (game.status === 'active' && (game.players || []).some(p => p.userId === user.id))
  );

  return (
    <Container>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>
              <i className="bi bi-list-ul me-2"></i>
              Available Games
            </h3>
            <div>
              <Button variant="outline-primary" onClick={loadGames}>
                <i className="bi bi-arrow-clockwise me-2"></i>
                Refresh
              </Button>
            </div>
          </div>

          {availableGames.length === 0 ? (
            <Alert variant="info" className="text-center">
              <Alert.Heading>No Games Available</Alert.Heading>
              <p>There are currently no games you can join. Check back later or ask an admin to create a game.</p>
            </Alert>
          ) : (
            <Row>
              {availableGames.map(game => (
                <Col key={game.id} md={6} lg={4} className="mb-4">
                  <GameCard 
                    game={game} 
                    onJoin={handleJoinGame}
                    currentUser={user}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default GameList;