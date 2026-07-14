import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PeladaProvider } from './PeladaContext';
import TabBar from './components/TabBar';
import Login from './screens/Login';
import ForgotPassword from './screens/ForgotPassword';
import ResetPassword from './screens/ResetPassword';
import Lista from './screens/Lista';
import Admin from './screens/Admin';
import Pagamento from './screens/Pagamento';
import Perfil from './screens/Perfil';

function PrivateArea() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loadingScreen">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <PeladaProvider>
      <div className="scroll">
        <Routes>
          <Route path="/lista" element={<Lista />} />
          <Route path="/pagamento" element={<Pagamento />} />
          {user.isAdmin && <Route path="/admin" element={<Admin />} />}
          <Route path="/perfil" element={<Perfil />} />
          <Route path="*" element={<Navigate to="/lista" replace />} />
        </Routes>
      </div>
      <TabBar />
    </PeladaProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <div className="app">
      <Routes>
        <Route
          path="/login"
          element={!loading && user ? <Navigate to="/lista" replace /> : <Login />}
        />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/*" element={<PrivateArea />} />
      </Routes>
    </div>
  );
}
