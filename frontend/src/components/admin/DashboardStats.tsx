import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Alert, Spinner } from 'react-bootstrap';
import apiService from '../../services/api';

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState({
    totalGames: 0,
    activeGames: 0,
    totalUsers: 0,
    totalGameTypes: 0
  });
  const [loading, setLoading] = useState(true);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [games, users, gameTypes] = await Promise.all([
          apiService.getGames(),
          apiService.getUsers().catch(() => []),
          apiService.getGameTypes().catch(() => [])
        ]);

        setStats({
          totalGames: games.length,
          activeGames: games.filter(g => g.status === 'active').length,
          totalUsers: users.length,
          totalGameTypes: gameTypes.length
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const handlePurgeDatabase = async () => {
    try {
      setPurging(true);
      setPurgeResult(null);
      await apiService.purgeDatabase();
      setPurgeResult('Database purged successfully! All games, moves, and non-admin users have been deleted.');
      
      // Refresh stats after purge
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error purging database:', error);
      setPurgeResult('Failed to purge database. Please try again.');
    } finally {
      setPurging(false);
    }
  };

  const StatCard: React.FC<{ title: string; value: number; color: string; icon: string }> = 
    ({ title, value, color, icon }) => (
      <Col md={3}>
        <Card className={`text-white bg-${color}`}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Card.Title as="h5">{title}</Card.Title>
                <h2>{loading ? '-' : value}</h2>
              </div>
              <div>
                <i className={`bi ${icon}`} style={{ fontSize: '2rem' }}></i>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Dashboard</h2>
        <Button 
          variant="danger" 
          size="sm"
          onClick={() => setShowPurgeModal(true)}
        >
          <i className="bi bi-trash me-2"></i>
          Purge Database
        </Button>
      </div>
      <Row>
        <StatCard
          title="Total Games"
          value={stats.totalGames}
          color="primary"
          icon="bi-puzzle"
        />
        <StatCard
          title="Active Games"
          value={stats.activeGames}
          color="success"
          icon="bi-play-fill"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          color="info"
          icon="bi-people"
        />
        <StatCard
          title="Game Types"
          value={stats.totalGameTypes}
          color="warning"
          icon="bi-collection"
        />
      </Row>

      {/* Purge Database Modal */}
      <Modal show={showPurgeModal} onHide={() => setShowPurgeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Purge Database
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <Alert.Heading>⚠️ DANGEROUS OPERATION</Alert.Heading>
            <p className="mb-0">
              This will permanently delete <strong>ALL</strong> of the following:
            </p>
            <ul className="mt-2 mb-0">
              <li>All games and game history</li>
              <li>All moves and game states</li>
              <li>All non-admin users</li>
              <li>All notifications</li>
            </ul>
          </Alert>
          
          <p className="text-muted">
            This action <strong>cannot be undone</strong>. Only the admin user will remain in the system.
          </p>
          
          {purgeResult && (
            <Alert variant={purgeResult.includes('successfully') ? 'success' : 'danger'}>
              {purgeResult}
            </Alert>
          )}
          
          <p className="mb-0">
            <strong>Are you absolutely sure you want to proceed?</strong>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowPurgeModal(false)}
            disabled={purging}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handlePurgeDatabase}
            disabled={purging}
          >
            {purging ? (
              <>
                <Spinner size="sm" className="me-2" />
                Purging...
              </>
            ) : (
              <>
                <i className="bi bi-trash me-2"></i>
                Yes, Purge Everything
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DashboardStats;