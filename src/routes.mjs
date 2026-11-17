export const pagePaths = Object.freeze({
  Ringkasan: '/ringkasan',
  Pemasukan: '/pemasukan',
  Pengeluaran: '/pengeluaran',
  Tabungan: '/tabungan',
  'Tema tampilan': '/tema',
  Langganan: '/langganan',
  Profil: '/profil',
});

const sections = new Set(['beranda', 'fitur', 'cara-mulai', 'paket', 'pertanyaan']);
const legacyPaths = {app: '/ringkasan', demo: '/demo', kenalan: '/beranda'};

export function pagePath(page, demo = false) {
  const path = pagePaths[page] || pagePaths.Ringkasan;
  return demo ? (page === 'Ringkasan' ? '/demo' : '/demo' + path) : path;
}

// Only known navigation fragments are migrated. Supabase callback fragments
// (access_token, refresh_token, error_description, etc.) must remain intact.
export function readRoute(location) {
  const fragment = location.hash.slice(1);
  const legacyPath = sections.has(fragment) ? '/' + fragment :
    Object.hasOwn(legacyPaths, fragment) ? legacyPaths[fragment] : null;
  const pathname = (legacyPath || location.pathname).replace(/\/+$/, '') || '/beranda';
  let route;
  if (sections.has(pathname.slice(1))) {
    route = {kind: 'public', path: pathname, section: pathname.slice(1)};
  } else {
    const demo = pathname === '/demo' || pathname.startsWith('/demo/');
    const appPath = demo ? pathname.slice(5) || '/ringkasan' : pathname;
    const page = Object.keys(pagePaths).find(key => pagePaths[key] === appPath);
    route = page ? {kind: demo ? 'demo' : 'app', path: pagePath(page, demo), page} :
      {kind: 'public', path: '/beranda', section: 'beranda'};
  }
  return {...route, url: route.path + location.search + (legacyPath ? '' : location.hash)};
}

export function isPlainNavigation(event) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function profileBackground(route) {
  if(route.page!=='Profil')return route;
  const fallback=pagePath('Ringkasan',route.kind==='demo');
  const read=pathname=>readRoute({pathname,hash:'',search:''});
  const background=read(route.state?.profileBackgroundPath||fallback);
  return background.kind===route.kind&&background.page&&background.page!=='Profil'?background:read(fallback);
}
