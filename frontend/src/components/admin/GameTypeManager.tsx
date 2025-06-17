import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Alert,
  Spinner,
  Badge,
  ButtonGroup,
  Modal,
  Form
} from 'react-bootstrap';
import { GameType } from '../../types';
import apiService from '../../services/api';

const GameTypeManager: React.FC = () => {
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testConfig, setTestConfig] = useState<string>('{}');
  const [validationResult, setValidationResult] = useState<{valid: boolean; message?: string} | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadGameTypes();
  }, []);

  const loadGameTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const gameTypesData = await apiService.getGameTypes();
      setGameTypes(gameTypesData);
    } catch (err) {
      setError('Failed to load game types');
      console.error('Error loading game types:', err);
    } finally {
      setLoading(false);
    }
  };

  const testGameType = (gameType: GameType) => {
    setSelectedGameType(gameType);
    setTestConfig('{}');
    setValidationResult(null);
    setShowTestModal(true);
  };

  const runValidationTest = async () => {
    if (!selectedGameType) return;

    try {
      setTesting(true);
      let config;
      try {
        config = JSON.parse(testConfig);
      } catch (parseError) {
        setValidationResult({
          valid: false,
          message: 'Invalid JSON configuration'
        });
        return;
      }

      const result = await apiService.validateGameType(selectedGameType.type, { settings: config });
      setValidationResult({
        valid: result.valid,
        message: result.valid ? 'Configuration is valid!' : 'Configuration validation failed'
      });
    } catch (err) {
      console.error('Error testing game type:', err);
      setValidationResult({
        valid: false,
        message: 'Error during validation test'
      });
    } finally {
      setTesting(false);
    }
  };

  const getPlayerRange = (gameType: GameType) => {
    if (gameType.minPlayers === gameType.maxPlayers) {
      return `${gameType.minPlayers} players`;
    }
    return `${gameType.minPlayers}-${gameType.maxPlayers} players`;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <div>Loading game types...</div>
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
              <i className="bi bi-collection me-2"></i>
              Game Type Manager
            </h2>
            <Button variant="outline-secondary" onClick={loadGameTypes}>
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

      <Alert variant="info" className="mb-4">
        <Alert.Heading>Game Types Overview</Alert.Heading>
        <p>Game types are automatically loaded from the plugin system. You can test their validation logic and configuration options here.</p>
      </Alert>

      {gameTypes.length === 0 ? (
        <Card>
          <Card.Body className="text-center p-5">
            <i className="bi bi-collection display-1 text-muted"></i>
            <h4 className="mt-3">No game types found</h4>
            <p className="text-muted">Game types are loaded from the plugin system.</p>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {gameTypes.map(gameType => (
            <Col key={gameType.type} lg={4} md={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title className="d-flex justify-content-between align-items-start">
                    <span>{gameType.name || gameType.type}</span>
                    <Badge bg="primary" className="ms-2">
                      {gameType.type}
                    </Badge>
                  </Card.Title>
                  
                  <Card.Text>
                    <div className="mb-2">
                      <strong>Players:</strong> <Badge bg="secondary">{getPlayerRange(gameType)}</Badge>
                    </div>
                    
                    {gameType.description && (
                      <div className="mb-2">
                        <strong>Description:</strong><br />
                        <small className="text-muted">{gameType.description}</small>
                      </div>
                    )}
                  </Card.Text>
                </Card.Body>
                
                <Card.Footer>
                  <ButtonGroup className="w-100">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => testGameType(gameType)}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Test Validation
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => window.open(`/vanilla/test-index.html?gameType=${gameType.type}`, '_blank')}
                    >
                      <i className="bi bi-play-circle me-1"></i>
                      Demo
                    </Button>
                  </ButtonGroup>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Test Validation Modal */}
      <Modal show={showTestModal} onHide={() => setShowTestModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Test Validation: {selectedGameType?.name || selectedGameType?.type}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Configuration JSON</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                value={testConfig}
                onChange={(e) => setTestConfig(e.target.value)}
                placeholder='Enter game configuration as JSON, e.g.: {"difficulty": "normal", "timeLimit": 300}'
                className="font-monospace"
              />
              <Form.Text className="text-muted">
                Enter a JSON object with game configuration settings to test the validation logic.
              </Form.Text>
            </Form.Group>

            {validationResult && (
              <Alert variant={validationResult.valid ? 'success' : 'danger'}>
                <div className="d-flex align-items-center">
                  <i className={`bi bi-${validationResult.valid ? 'check-circle' : 'x-circle'} me-2`}></i>
                  <strong>
                    {validationResult.valid ? 'Valid Configuration' : 'Invalid Configuration'}
                  </strong>
                </div>
                {validationResult.message && (
                  <div className="mt-2">
                    {validationResult.message}
                  </div>
                )}
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTestModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={runValidationTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <Spinner size="sm" className="me-2" />
                Testing...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Run Test
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GameTypeManager;