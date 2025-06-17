import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Modal, 
  Alert,
  Spinner,
  Badge,
  ButtonGroup
} from 'react-bootstrap';
import { User } from '../../types';
import apiService from '../../services/api';

interface UserWithStats extends User {
  gamesPlayed?: number;
  lastActive?: string;
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [loadingUserGames, setLoadingUserGames] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await apiService.getUsers();
      setUsers(usersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      setError('Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewUser = async (user: UserWithStats) => {
    setSelectedUser(user);
    setShowUserModal(true);
    
    // Load user's games
    try {
      setLoadingUserGames(true);
      const games = await apiService.getUserGames(user.id);
      setUserGames(games);
    } catch (err) {
      console.error('Error loading user games:', err);
      setUserGames([]);
    } finally {
      setLoadingUserGames(false);
    }
  };

  const getGameStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <div>Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <i className="bi bi-people me-2"></i>
              User Manager
            </h2>
            <Button variant="outline-secondary" onClick={loadUsers}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Refresh
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Users ({users.length})</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {users.length === 0 ? (
            <div className="text-center p-4">
              <i className="bi bi-people display-1 text-muted"></i>
              <h4 className="mt-3">No users found</h4>
              <p className="text-muted">Users will appear here when they register.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Games Played</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="fw-bold">{user.username}</div>
                      <small className="text-muted">{user.id.substring(0, 8)}...</small>
                    </td>
                    <td>{user.email || 'Not provided'}</td>
                    <td>
                      <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                      <small className="text-muted">
                        {new Date(user.createdAt).toLocaleTimeString()}
                      </small>
                    </td>
                    <td>
                      <Badge bg="secondary">{user.gamesPlayed || 0}</Badge>
                    </td>
                    <td>
                      {user.lastActive ? (
                        <>
                          <div>{new Date(user.lastActive).toLocaleDateString()}</div>
                          <small className="text-muted">
                            {new Date(user.lastActive).toLocaleTimeString()}
                          </small>
                        </>
                      ) : (
                        <span className="text-muted">Never</span>
                      )}
                    </td>
                    <td>
                      <ButtonGroup size="sm">
                        <Button
                          variant="info"
                          onClick={() => viewUser(user)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => viewUser(user)}
                          title="View Games"
                        >
                          <i className="bi bi-controller"></i>
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* User Details Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            User Details: {selectedUser?.username}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row>
              <Col md={6}>
                <h6>User Information</h6>
                <Table size="sm" borderless>
                  <tbody>
                    <tr>
                      <td><strong>ID:</strong></td>
                      <td><code>{selectedUser.id}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Username:</strong></td>
                      <td>{selectedUser.username}</td>
                    </tr>
                    <tr>
                      <td><strong>Email:</strong></td>
                      <td>{selectedUser.email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td><strong>Registered:</strong></td>
                      <td>{new Date(selectedUser.createdAt).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td><strong>Games Played:</strong></td>
                      <td><Badge bg="secondary">{selectedUser.gamesPlayed || 0}</Badge></td>
                    </tr>
                    <tr>
                      <td><strong>Last Active:</strong></td>
                      <td>
                        {selectedUser.lastActive 
                          ? new Date(selectedUser.lastActive).toLocaleString()
                          : 'Never'
                        }
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Recent Games</h6>
                {loadingUserGames ? (
                  <div className="text-center p-3">
                    <Spinner size="sm" className="me-2" />
                    Loading games...
                  </div>
                ) : userGames.length === 0 ? (
                  <p className="text-muted">No games played yet</p>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table size="sm">
                      <thead>
                        <tr>
                          <th>Game</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userGames.slice(0, 10).map((game, index) => (
                          <tr key={game.id || index}>
                            <td>
                              <div className="fw-bold" style={{ fontSize: '0.875rem' }}>
                                {game.name || 'Unnamed Game'}
                              </div>
                              <small className="text-muted">
                                {game.id ? game.id.substring(0, 8) + '...' : 'N/A'}
                              </small>
                            </td>
                            <td>
                              <Badge bg="secondary" className="small">
                                {formatGameType(game.gameType)}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={getGameStatusColor(game.status)} className="small">
                                {game.status}
                              </Badge>
                            </td>
                            <td>
                              <small>
                                {game.createdAt ? new Date(game.createdAt).toLocaleDateString() : 'N/A'}
                              </small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {userGames.length > 10 && (
                      <small className="text-muted">Showing 10 of {userGames.length} games</small>
                    )}
                  </div>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManager;