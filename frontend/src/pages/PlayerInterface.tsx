import React from 'react';
import { Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/player/LoginForm';
import GameList from '../components/player/GameList';

const PlayerInterface: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      {user ? <GameList /> : <LoginForm />}
    </Container>
  );
};

export default PlayerInterface;