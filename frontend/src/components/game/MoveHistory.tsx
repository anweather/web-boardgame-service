import React from 'react';
import { Card } from 'react-bootstrap';
import { GameMove } from '../../types';

interface MoveHistoryProps {
  moves: GameMove[];
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const formatMove = (moveData: any) => {
    if (typeof moveData === 'string') {
      return moveData;
    }
    if (moveData && typeof moveData === 'object') {
      if (moveData.from && moveData.to) {
        return `${moveData.from}-${moveData.to}`;
      }
      if (moveData.san) return moveData.san;
      if (moveData.lan) return moveData.lan;
    }
    return JSON.stringify(moveData);
  };

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">
          <i className="bi bi-clock-history me-2"></i>
          Move History
        </h6>
      </Card.Header>
      <Card.Body>
        <div 
          className="move-history"
          style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}
        >
          {moves.length === 0 ? (
            <div className="text-muted text-center">No moves yet</div>
          ) : (
            moves.map((move, index) => (
              <div key={move.id || index} className="mb-1">
                <strong>{move.moveNumber}.</strong>{' '}
                {move.player.username}: {formatMove(move.move)}
              </div>
            ))
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default MoveHistory;