import {useCallback, useEffect, useState} from 'react';
import {readRoute} from './routes.mjs';
const browserRoute=()=>({...readRoute(window.location),state:window.history.state});

export default function useNavigation() {
  const [route, setRoute] = useState(browserRoute);
  const navigate = useCallback((path, {replace = false,state=null} = {}) => {
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (current !== path) window.history[replace ? 'replaceState' : 'pushState'](state, '', path);
    setRoute(browserRoute());
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = browserRoute();
      const current = window.location.pathname + window.location.search + window.location.hash;
      // Leave unrecognized fragments untouched while Supabase handles auth.
      if (current !== next.url && (!window.location.hash || next.url.indexOf('#') === -1)) {
        window.history.replaceState(window.history.state, '', next.url);
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
