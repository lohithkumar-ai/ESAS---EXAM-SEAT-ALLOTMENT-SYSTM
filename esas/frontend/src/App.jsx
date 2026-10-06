import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExamSelect from './pages/ExamSelect';
import ExamSession from './pages/ExamSession';
import NRUpload from './pages/NRUpload';
import Students from './pages/Students';
import Rooms from './pages/Rooms';
import SeatingChart from './pages/SeatingChart';
import Reports from './pages/Reports';
import Search from './pages/Search';

export default function App() {
  return (
    <HashRouter>
      <Routes>

        {/* Dashboard */}
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />

        {/* Examination */}
        <Route
          path="/examination"
          element={
            <Layout>
              <ExamSelect />
            </Layout>
          }
        />

        <Route
          path="/examination/:sessionId"
          element={
            <Layout>
              <ExamSession />
            </Layout>
          }
        />

        {/* NR Upload */}
        <Route
          path="/upload/:sessionId"
          element={
            <Layout>
              <NRUpload />
            </Layout>
          }
        />

        {/* Students */}
        <Route
          path="/students"
          element={
            <Layout>
              <Students />
            </Layout>
          }
        />

        {/* Rooms */}
        <Route
          path="/rooms"
          element={
            <Layout>
              <Rooms />
            </Layout>
          }
        />

        <Route
          path="/rooms/:roomId/chart"
          element={
            <Layout>
              <SeatingChart />
            </Layout>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <Layout>
              <Reports />
            </Layout>
          }
        />

        {/* Examination Rooms */}
        <Route
          path="/examination/:sessionId/rooms"
          element={
            <Layout>
              <Rooms />
            </Layout>
          }
        />

        <Route
          path="/examination/:sessionId/rooms/:roomId/chart"
          element={
            <Layout>
              <SeatingChart />
            </Layout>
          }
        />

        <Route
          path="/examination/:sessionId/reports"
          element={
            <Layout>
              <Reports />
            </Layout>
          }
        />

        {/* Search */}
        <Route
          path="/search"
          element={
            <Layout>
              <Search />
            </Layout>
          }
        />

        {/* Anything unknown → Dashboard */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </HashRouter>
  );
}