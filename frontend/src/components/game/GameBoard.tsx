import React from 'react';
import { Card, Alert } from 'react-bootstrap';
import { GameBoardProps } from '../../types';

const GameBoard: React.FC<GameBoardProps> = ({ game, onMove, currentUser, disabled }) => {
  // For now, we'll show the board image. Later we'll implement interactive layouts
  const boardImageUrl = `${window.location.origin}/api/games/${game.id}/image?t=${Date.now()}`;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Failed to load board image');
    e.currentTarget.style.display = 'none';
  };

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">
          <i className="bi bi-grid-3x3 me-2"></i>
          Game Board
        </h6>
      </Card.Header>
      <Card.Body className="text-center">
        {game.status === 'waiting' ? (
          <Alert variant="info">
            <Alert.Heading>Game Not Started</Alert.Heading>
            <p>Waiting for players to join before the game can begin.</p>
          </Alert>
        ) : (
          <div>
            <img
              src={boardImageUrl}
              alt="Game Board"
              className="img-fluid"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}
              onError={handleImageError}
            />
            
            {disabled && (
              <div className="mt-2">
                <small className="text-muted">
                  {game.status !== 'active' 
                    ? 'Game is not active' 
                    : 'Not your turn'
                  }
                </small>
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default GameBoard;