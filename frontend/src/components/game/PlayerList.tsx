import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { GamePlayer, User } from '../../types';

interface PlayerListProps {
  players: GamePlayer[];
  currentUser: User;
  currentPlayerId?: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentUser, currentPlayerId }) => {
  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">
          <i className="bi bi-people me-2"></i>
          Players ({players.length})
        </h6>
      </Card.Header>
      <Card.Body className="p-0">
        {players.length === 0 ? (
          <div className="p-3 text-muted text-center">
            No players yet
          </div>
        ) : (
          <ListGroup variant="flush">
            {players.map((player, index) => (
              <ListGroup.Item 
                key={player.userId}
                className="d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{player.username}</strong>
                  {player.userId === currentUser.id && (
                    <Badge bg="secondary" className="ms-2">You</Badge>
                  )}
                  {player.color && (
                    <small className="text-muted ms-2">({player.color})</small>
                  )}
                </div>
                <div>
                  {currentPlayerId === player.userId && (
                    <Badge bg="success" title="Current turn">
                      <i className="bi bi-cursor"></i>
                    </Badge>
                  )}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
};

export default PlayerList;