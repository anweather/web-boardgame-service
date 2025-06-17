import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import { Game, User } from '../../types';

interface GameInfoProps {
  game: Game;
  currentUser: User;
}

const GameInfo: React.FC<GameInfoProps> = ({ game, currentUser }) => {
  const isMyTurn = game.currentPlayerId === currentUser.id;
  const isActive = game.status === 'active';
  const isUserInGame = (game.players || []).some(p => p.userId === currentUser.id);

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

  const copyGameLink = () => {
    const gameUrl = `${window.location.origin}/game/${game.id}`;
    navigator.clipboard.writeText(gameUrl).then(() => {
      // Could show a toast notification here
      console.log('Game link copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy game link:', err);
    });
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Row className="align-items-center">
          <Col md={6}>
            <Card.Title className="mb-2">
              {game.name || 'Unnamed Game'}
            </Card.Title>
            <div className="mb-2">
              <Badge bg="secondary" className="me-2">
                {formatGameType(game.gameType)}
              </Badge>
              <Badge bg={getStatusColor(game.status)}>
                {game.status}
              </Badge>
            </div>
            <div className="text-muted">
              <div><strong>Move:</strong> {game.moveCount || 0}</div>
              <div><strong>Players:</strong> {(game.players || []).length}/{game.maxPlayers}</div>
            </div>
          </Col>
          
          <Col md={6}>
            {isActive && isUserInGame && (
              <div className="text-center">
                {isMyTurn ? (
                  <div className="alert alert-warning py-2 mb-2">
                    <strong><i className="bi bi-clock me-1"></i> It's your turn!</strong>
                  </div>
                ) : (
                  <div className="text-muted mb-2">
                    <i className="bi bi-hourglass-split me-1"></i>
                    Waiting for other player...
                  </div>
                )}
              </div>
            )}
            
            <div className="d-flex gap-2 justify-content-end">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={copyGameLink}
              >
                <i className="bi bi-link-45deg me-1"></i>
                Copy Link
              </Button>
              
              <Button 
                variant="outline-secondary" 
                size="sm"
                href="/player"
              >
                <i className="bi bi-arrow-left me-1"></i>
                Back to Games
              </Button>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default GameInfo;