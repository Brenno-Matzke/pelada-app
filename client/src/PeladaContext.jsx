import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';

const PeladaContext = createContext(null);

export function PeladaProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getPelada();
      setState(data);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // Wrap a mutating API call: run it, then refresh shared state, surfacing
  // errors to the caller so screens can show inline feedback.
  const runAction = useCallback(
    async (fn) => {
      try {
        setError(null);
        const data = await fn();
        setState(data);
        return data;
      } catch (e) {
        setError(e.message);
        throw e;
      }
    },
    []
  );

  const value = {
    state,
    loading,
    error,
    refresh,
    confirm: () => runAction(api.confirm),
    cancel: () => runAction(api.cancel),
    togglePaid: () => runAction(api.togglePaid),
    updatePelada: (payload) => runAction(() => api.updatePelada(payload)),
    removePlayer: (userId) => runAction(() => api.removePlayer(userId)),
    togglePlayerPaid: (userId) => runAction(() => api.togglePlayerPaid(userId)),
    promoteWaitlist: (userId) => runAction(() => api.promoteWaitlist(userId)),
    generateTeams: () => runAction(api.generateTeams),
    assignTeam: (userId, teamNumber) => runAction(() => api.assignTeam(userId, teamNumber)),
    clearAllTeams: () => runAction(api.clearAllTeams),
    clearTeam: (teamNumber) => runAction(() => api.clearTeam(teamNumber)),
  };

  return <PeladaContext.Provider value={value}>{children}</PeladaContext.Provider>;
}

export function usePelada() {
  const ctx = useContext(PeladaContext);
  if (!ctx) throw new Error('usePelada deve ser usado dentro de PeladaProvider');
  return ctx;
}
