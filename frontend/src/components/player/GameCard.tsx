import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { GameCardProps } from '../../types';

const GameCard: React.FC<GameCardProps> = ({ game, onJoin, currentUser }) => {
  const players = game.players || [];
  const isUserInGame = players.some(p => p.userId === currentUser.id);
  const playerCount = players.length;
  const isWaiting = game.status === 'waiting';
  const canJoin = isWaiting && playerCount < (game.maxPlayers || 2);

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

  return (
    <Card className="h-100 game-card" style={{ transition: 'transform 0.2s' }}>
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-start">
          <span>{game.name || 'Unnamed Game'}</span>
          {isUserInGame && (
            <Badge bg="success" title="You are in this game">
              <i className="bi bi-check-circle"></i>
            </Badge>
          )}
        </Card.Title>
        
        <div className="mb-2">
          <Badge bg="secondary" className="me-2">
            {formatGameType(game.gameType)}
          </Badge>
          <Badge bg={getStatusColor(game.status)}>
            {game.status}
          </Badge>
        </div>

        <Card.Text>
          <small className="text-muted">
            <i className="bi bi-people me-1"></i>
            {playerCount}/{game.maxPlayers || 2} players
          </small>
          {isWaiting && playerCount < (game.maxPlayers || 2) && (
            <div className="text-warning mt-1">
              <small>
                <i className="bi bi-exclamation-triangle me-1"></i>
                Waiting for {(game.maxPlayers || 2) - playerCount} more player(s)
              </small>
            </div>
          )}
        </Card.Text>

        <Card.Text>
          <small className="text-muted">
            <i className="bi bi-clock me-1"></i>
            Created {new Date(game.createdAt).toLocaleDateString()}
          </small>
        </Card.Text>

        <Card.Text>
          <small className="text-muted">
            Moves: {game.moveCount || 0}
          </small>
        </Card.Text>
      </Card.Body>
      
      <Card.Footer>
        <Button 
          variant="primary" 
          size="sm" 
          className="w-100"
          onClick={() => onJoin(game.id)}
        >
          <i className="bi bi-box-arrow-in-right me-1"></i>
          {isUserInGame ? 'Resume Game' : canJoin ? 'Join Game' : 'View Game'}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default GameCard;