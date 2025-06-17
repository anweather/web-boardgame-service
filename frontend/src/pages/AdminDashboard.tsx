import React, { useState } from 'react';
import { Container, Row, Col, Nav, Tab } from 'react-bootstrap';
import DashboardStats from '../components/admin/DashboardStats';
import GameManager from '../components/admin/GameManager';
import UserManager from '../components/admin/UserManager';
import GameTypeManager from '../components/admin/GameTypeManager';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col md={3} lg={2}>
          <div className="d-flex flex-column">
            <h4 className="mb-3">Admin Panel</h4>
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <i className="bi bi-speedometer2 me-2"></i>
                  Dashboard
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'games'}
                  onClick={() => setActiveTab('games')}
                >
                  <i className="bi bi-puzzle me-2"></i>
                  Games
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'users'}
                  onClick={() => setActiveTab('users')}
                >
                  <i className="bi bi-people me-2"></i>
                  Users
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'game-types'}
                  onClick={() => setActiveTab('game-types')}
                >
                  <i className="bi bi-collection me-2"></i>
                  Game Types
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
        </Col>
        
        <Col md={9} lg={10}>
          <Tab.Container activeKey={activeTab}>
            <Tab.Content>
              <Tab.Pane eventKey="dashboard">
                <DashboardStats />
              </Tab.Pane>
              <Tab.Pane eventKey="games">
                <GameManager />
              </Tab.Pane>
              <Tab.Pane eventKey="users">
                <UserManager />
              </Tab.Pane>
              <Tab.Pane eventKey="game-types">
                <GameTypeManager />
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;