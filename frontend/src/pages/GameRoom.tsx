import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Container, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../contexts/AuthContext';
import GameBoard from '../components/game/GameBoard';
import GameControls from '../components/game/GameControls';
import GameInfo from '../components/game/GameInfo';
import PlayerList from '../components/game/PlayerList';
import MoveHistory from '../components/game/MoveHistory';

const GameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { game, loading, error, makeMove } = useGame(gameId!);

  if (!gameId) {
    return <Navigate to="/player" replace />;
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3" />
          <div>Loading game...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Game</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Alert.Link href="/player">Back to Game List</Alert.Link>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!game) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Game Not Found</Alert.Heading>
          <p>The requested game could not be found.</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Alert.Link href="/player">Back to Game List</Alert.Link>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!user) {
    return <Navigate to="/player" replace />;
  }

  // Check if user is in the game
  const isPlayerInGame = (game.players || []).some(p => p.userId === user.id);
  
  return (
    <Container fluid className="mt-4">
      <Row>
        {/* Main Game Area */}
        <Col lg={8}>
          <GameInfo game={game} currentUser={user} />
          
          <div className="mt-4">
            <GameBoard 
              game={game} 
              onMove={makeMove} 
              currentUser={user}
              disabled={!isPlayerInGame || game.status !== 'active'}
            />
          </div>
        </Col>
        
        {/* Sidebar */}
        <Col lg={4}>
          <GameControls 
            game={game} 
            onMove={makeMove} 
            currentUser={user}
            disabled={!isPlayerInGame || game.status !== 'active'}
          />
          
          <div className="mt-3">
            <PlayerList players={game.players || []} currentUser={user} />
          </div>
          
          <div className="mt-3">
            <MoveHistory moves={game.moves || []} />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default GameRoom;