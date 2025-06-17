import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useSocketConnection } from '../../contexts/SocketContext';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const isConnected = useSocketConnection();

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand>
            <i className="bi bi-controller me-2"></i>
            Board Game Service
          </Navbar.Brand>
        </LinkContainer>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/player">
              <Nav.Link>
                <i className="bi bi-controller me-1"></i>
                Player
              </Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/admin">
              <Nav.Link>
                <i className="bi bi-gear me-1"></i>
                Admin
              </Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav className="align-items-center">
            {/* Connection Status */}
            <Badge 
              bg={isConnected ? 'success' : 'danger'} 
              className="me-3"
              title={isConnected ? 'Connected to server' : 'Disconnected from server'}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            
            {/* User Info */}
            {user ? (
              <>
                <Navbar.Text className="me-3">
                  Welcome, <strong>{user.username}</strong>
                </Navbar.Text>
                <Nav.Link 
                  onClick={logout}
                  style={{ cursor: 'pointer' }}
                  title="Logout"
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span className="d-none d-sm-inline ms-1">Logout</span>
                </Nav.Link>
              </>
            ) : (
              <Navbar.Text>
                <Badge bg="secondary">Not logged in</Badge>
              </Navbar.Text>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;