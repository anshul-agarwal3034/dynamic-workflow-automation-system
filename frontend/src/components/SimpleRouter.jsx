/**
 * SimpleRouter.jsx
 * 
 * Dependency-free hash router supporting both route.element (JSX elements)
 * and route.component (component functions with dynamic params).
 */

const getHashPath = () => {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/' || hash === '#') {
    const token = localStorage.getItem('auth_token');
    return token ? '/home' : '/signin';
  }
  let path = hash.startsWith('#') ? hash.slice(1) : hash;
  const qIdx = path.indexOf('?');
  const basePath = qIdx !== -1 ? path.slice(0, qIdx) : path;
  if (!basePath || basePath === '/') {
    const token = localStorage.getItem('auth_token');
    return token ? '/home' : '/signin';
  }
  return basePath;
};

const useHashRoute = () => {
  const [path, setPath] = React.useState(getHashPath);

  React.useEffect(() => {
    const handleHashChange = () => {
      setPath(getHashPath());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return path;
};

const navigate = (toPath) => {
  window.location.hash = `#${toPath}`;
};

const matchRoute = (pattern, currentPath) => {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = currentPath.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const pSeg = patternSegments[i];
    const cSeg = pathSegments[i];

    if (pSeg.startsWith(':')) {
      const paramName = pSeg.slice(1);
      params[paramName] = decodeURIComponent(cSeg);
    } else if (pSeg !== cSeg) {
      return null;
    }
  }

  return params;
};

const Router = ({ routes }) => {
  const currentPath = useHashRoute();

  let matchedRoute = null;
  let matchedParams = {};

  for (const route of routes) {
    const params = matchRoute(route.path, currentPath);
    if (params !== null) {
      matchedRoute = route;
      matchedParams = params;
      break;
    }
  }

  // Fallback matching if route was not matched
  if (!matchedRoute) {
    const fallbackPath = localStorage.getItem('auth_token') ? '/home' : '/signin';
    for (const route of routes) {
      const params = matchRoute(route.path, fallbackPath);
      if (params !== null) {
        matchedRoute = route;
        matchedParams = params;
        break;
      }
    }
  }

  React.useEffect(() => {
    if (!matchedRoute) {
      const token = localStorage.getItem('auth_token');
      navigate(token ? '/home' : '/signin');
    }
  }, [currentPath, matchedRoute]);

  if (!matchedRoute) {
    return null;
  }

  if (matchedRoute.element) {
    return matchedRoute.element;
  }

  const Component = matchedRoute.component;
  return <Component {...matchedParams} />;
};
