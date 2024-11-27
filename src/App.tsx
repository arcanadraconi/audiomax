import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IndexLogin } from './pages/indexLogin';
import { IndexSignup } from './pages/indexSignup';
import Studio from './pages/Studio';
import { Layout } from './components/layout/Layout';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useState, useEffect } from 'react';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    // Loading state
    return (
      <div className="flex items-center justify-center h-screen" role="status">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><IndexLogin /></Layout>} />
        <Route path="/signup" element={<Layout><IndexSignup /></Layout>} />
        <Route 
          path="/studio" 
          element={
            <ProtectedRoute>
              <Layout><Studio /></Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
