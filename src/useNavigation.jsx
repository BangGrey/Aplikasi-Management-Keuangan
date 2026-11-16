import {useCallback, useEffect, useState} from 'react';
import {readRoute} from './routes.mjs';

export default function useNavigation() {
  const [route, setRoute] = useState(() => readRoute(window.location));
  const navigate = useCallback((path, {replace = false} = {}) => {
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (current !== path) window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
    setRoute(readRoute(window.location));
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = readRoute(window.location);
      const current = window.location.pathname + window.location.search + window.location.hash;
      // Leave unrecognized fragments untouched while Supabase handles auth.
      if (current !== next.url && (!window.location.hash || next.url.indexOf('#') === -1)) {
        window.history.replaceState(null, '', next.url);
      }
      setRoute(next);
    };
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);
  return [route, navigate];
}
