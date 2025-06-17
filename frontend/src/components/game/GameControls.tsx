import React, { useState, useRef } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { GameControlsProps, ApiError } from '../../types';

const GameControls: React.FC<GameControlsProps> = ({ game, onMove, currentUser, disabled }) => {
  const [moveInput, setMoveInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveInput.trim() || disabled) return;

    try {
      setLoading(true);
      setError(null);
      
      // For now, just pass the raw move text. Later we'll add game-specific parsing
      await onMove(moveInput.trim());
      setMoveInput('');
      
      // Focus the input field after successful move for rapid entry
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to make move';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMoveInputPlaceholder = () => {
    switch (game.gameType) {
      case 'chess':
        return 'e.g., e2-e4, Nf3, O-O';
      case 'solitaire':
        return 'e.g., d, wh, 1-7, 1-7 x3, f1';
      case 'checkers':
        return 'e.g., a3-b4';
      default:
        return 'Enter your move';
    }
  };

  const getMoveInputHelp = () => {
    switch (game.gameType) {
      case 'chess':
        return 'Use coordinate notation (e2-e4) or algebraic notation (Nf3)';
      case 'solitaire':
        return 'Commands: d=draw, r=reset, wh=waste to hearts, 1-7=move cards (auto-detects max), 1-7 x3=move 3 cards, f1=flip tableau 1';
      case 'checkers':
        return 'Use coordinate notation for checker moves';
      default:
        return 'Enter your move in the appropriate format';
    }
  };

  return (
    <Card>
      <Card.Header>
        <h6 className="mb-0">
          <i className="bi bi-cursor-text me-2"></i>
          Make Move
        </h6>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Move</Form.Label>
            <Form.Control
              ref={inputRef}
              type="text"
              value={moveInput}
              onChange={(e) => setMoveInput(e.target.value)}
              placeholder={getMoveInputPlaceholder()}
              disabled={disabled || loading}
              autoComplete="off"
            />
            <Form.Text className="text-muted">
              {getMoveInputHelp()}
            </Form.Text>
          </Form.Group>

          <div className="d-grid">
            <Button 
              type="submit" 
              variant="success"
              disabled={disabled || loading || !moveInput.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Submit Move
                </>
              )}
            </Button>
          </div>
        </Form>

        {disabled && (
          <div className="mt-3">
            <Alert variant="info" className="mb-0">
              {game.status !== 'active' 
                ? 'Game is not active' 
                : 'Wait for your turn to make a move'
              }
            </Alert>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default GameControls;