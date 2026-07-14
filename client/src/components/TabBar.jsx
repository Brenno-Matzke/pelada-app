import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const tabClass = ({ isActive }) => `tabLabel ${isActive ? 'accent' : 'muted'}`;

export default function TabBar() {
  const { user } = useAuth();
  return (
    <div className="tabbar">
      <NavLink to="/lista" className="tab">
        {({ isActive }) => (
          <>
            <span className="fs20">🏐</span>
            <span className={tabClass({ isActive })}>Pelada</span>
          </>
        )}
      </NavLink>
      <NavLink to="/pagamento" className="tab">
        {({ isActive }) => (
          <>
            <span className="fs20">💳</span>
            <span className={tabClass({ isActive })}>Pagamento</span>
          </>
        )}
      </NavLink>
      {user?.isAdmin && (
        <NavLink to="/admin" className="tab">
          {({ isActive }) => (
            <>
              <span className="fs20">⚙️</span>
              <span className={tabClass({ isActive })}>Admin</span>
            </>
          )}
        </NavLink>
      )}
      <NavLink to="/perfil" className="tab">
        {({ isActive }) => (
          <>
            <span className="fs20">👤</span>
            <span className={tabClass({ isActive })}>Perfil</span>
          </>
        )}
      </NavLink>
    </div>
  );
}
