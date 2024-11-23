import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IndexLogin } from './pages/indexLogin';
import { IndexSignup } from './pages/indexSignup';
import Studio from './pages/Studio';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Layout><IndexLogin /></Layout>} />
          <Route path="/signup" element={<Layout><IndexSignup /></Layout>} />
          <Route path="/studio" element={<Layout><Studio /></Layout>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
