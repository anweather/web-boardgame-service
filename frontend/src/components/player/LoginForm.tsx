import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../types';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    if (isRegistering && !email) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isRegistering) {
        await register(username, password, email);
      } else {
        await login(username, password);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      await login(user, pass);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Quick login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card>
            <Card.Body>
              <Card.Title className="text-center mb-4">
                <i className="bi bi-person-circle me-2"></i>
                {isRegistering ? 'Create Account' : 'Player Login'}
              </Card.Title>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                {isRegistering && (
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                      disabled={loading}
                    />
                  </Form.Group>
                )}

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        {isRegistering ? 'Creating Account...' : 'Logging in...'}
                      </>
                    ) : (
                      <>
                        <i className={`bi ${isRegistering ? 'bi-person-plus' : 'bi-box-arrow-in-right'} me-2`}></i>
                        {isRegistering ? 'Create Account' : 'Login'}
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setIsRegistering(!isRegistering)}
                    disabled={loading}
                  >
                    {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                  </Button>
                </div>
              </Form>

              {!isRegistering && (
                <div className="mt-4 pt-3 border-top">
                  <small className="text-muted">
                    <strong>Quick Login:</strong>
                  </small>
                  <div className="d-flex gap-2 mt-2">
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => quickLogin('admin', 'admin123')}
                      disabled={loading}
                    >
                      admin
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => quickLogin('player2', 'test123')}
                      disabled={loading}
                    >
                      player2
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => quickLogin('anweather', '123456')}
                      disabled={loading}
                    >
                      anweather
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginForm;