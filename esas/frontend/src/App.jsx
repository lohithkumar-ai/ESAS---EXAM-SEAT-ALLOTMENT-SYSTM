import { useEffect, useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

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

import { authAPI } from './services/api';


// ============================================================
// AUTOMATIC LOGIN
// ============================================================

async function performAutomaticLogin() {
  try {
    // Check whether we already have a token
    const existingToken =
      localStorage.getItem('esas_token') ||
      sessionStorage.getItem('esas_token');

    if (existingToken) {
      console.log('ESAS: Existing login found.');
      return true;
    }

    console.log('ESAS: Performing automatic login...');

    // Default ESAS account
    const username = 'lavanya';
    const password = 'CSE101';

    const response = await authAPI.login(
      username,
      password
    );

    // Save access token
    if (response.data?.access) {
      localStorage.setItem(
        'esas_token',
        response.data.access
      );
    }

    // Save refresh token
    if (response.data?.refresh) {
      localStorage.setItem(
        'esas_refresh',
        response.data.refresh
      );
    }

    // Save user information
    if (response.data?.user) {
      localStorage.setItem(
        'esas_user',
        JSON.stringify(response.data.user)
      );
    } else {
      // Fallback user information
      const defaultUser = {
        id: 20,
        username: 'lavanya',
        email: 'lavanya@esas.com',
        first_name: 'Lavanya',
        last_name: '',
        role: 'ADMIN',
      };

      localStorage.setItem(
        'esas_user',
        JSON.stringify(defaultUser)
      );
    }

    console.log('ESAS: Automatic login successful.');

    return true;
  } catch (error) {
    console.error(
      'ESAS: Automatic login failed:',
      error
    );

    /*
     * Keep the application accessible even if the backend
     * is temporarily unavailable.
     *
     * This creates a local demo session.
     */
    const fallbackUser = {
      id: 20,
      username: 'lavanya',
      email: 'lavanya@esas.com',
      first_name: 'Lavanya',
      last_name: '',
      role: 'ADMIN',
    };

    localStorage.setItem(
      'esas_token',
      'offline-admin-token'
    );

    localStorage.setItem(
      'esas_user',
      JSON.stringify(fallbackUser)
    );

    return true;
  }
}


// ============================================================
// APP
// ============================================================

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      await performAutomaticLogin();

      if (mounted) {
        setReady(true);
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);


  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '600',
        }}
      >
        Loading ESAS...
      </div>
    );
  }


  // ==========================================================
  // ROUTES
  // ==========================================================

  return (
    <HashRouter>
      <Routes>

        {/* ====================================================
            DASHBOARD
        ==================================================== */}

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


        {/* ====================================================
            EXAMINATION
        ==================================================== */}

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


        {/* ====================================================
            NR UPLOAD
        ==================================================== */}

        <Route
          path="/upload/:sessionId"
          element={
            <Layout>
              <NRUpload />
            </Layout>
          }
        />


        {/* ====================================================
            STUDENTS
        ==================================================== */}

        <Route
          path="/students"
          element={
            <Layout>
              <Students />
            </Layout>
          }
        />


        {/* ====================================================
            ROOMS
        ==================================================== */}

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


        {/* ====================================================
            REPORTS
        ==================================================== */}

        <Route
          path="/reports"
          element={
            <Layout>
              <Reports />
            </Layout>
          }
        />


        {/* ====================================================
            EXAMINATION ROOMS
        ==================================================== */}

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


        {/* ====================================================
            SEARCH
        ==================================================== */}

        <Route
          path="/search"
          element={
            <Layout>
              <Search />
            </Layout>
          }
        />


        {/* ====================================================
            UNKNOWN URL
            Go back to Dashboard
        ==================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </HashRouter>
  );
}