import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Navigation from './components/common/Navigation';
import AdminDashboard from './pages/AdminDashboard';
import PlayerInterface from './pages/PlayerInterface';
import GameRoom from './pages/GameRoom';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <Navigation />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Navigate to="/player" replace />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/player" element={<PlayerInterface />} />
                  <Route 
                    path="/game/:gameId" 
                    element={
                      <ProtectedRoute>
                        <GameRoom />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/player" replace />} />
                </Routes>
              </main>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
