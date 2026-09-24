import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './index.css';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExamSelect from './pages/ExamSelect';
import ExamSession from './pages/ExamSession';
import NRUpload from './pages/NRUpload';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import SeatingChart from './pages/SeatingChart';
import Reports from './pages/Reports';
import Search from './pages/Search';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('esas_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/examination" element={<ExamSelect />} />
                  <Route path="/examination/:sessionId" element={<ExamSession />} />
                  <Route path="/upload/:sessionId" element={<NRUpload />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/rooms/:roomId/chart" element={<SeatingChart />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/examination/:sessionId/rooms" element={<Rooms />} />
                  <Route path="/examination/:sessionId/rooms/:roomId/chart" element={<SeatingChart />} />
                  <Route path="/examination/:sessionId/reports" element={<Reports />} />
                  <Route path="/search" element={<Search />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
