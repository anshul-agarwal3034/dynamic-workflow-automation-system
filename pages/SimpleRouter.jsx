/**
 * SimpleRouter.jsx
 * 
 * WHY A CUSTOM ROUTER IS USED INSTEAD OF react-router-dom:
 * The CDN-hosted UMD build of react-router-dom is unreliable for browser <script>-tag use 
 * (it's primarily built for bundler-based projects and can fail due to CORS or scope issues), 
 * so a small dependency-free router avoids that failure mode entirely.
 */

// Helper to get raw hash path (stripping leading '#')
const getHashPath = () => {
  const hash = window.location.hash;
  if (!hash || hash === '#') return '/signin';
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  return path || '/signin';
};

// Custom Hook: Listens for hash changes and returns current path
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

// Global navigate helper function
const navigate = (toPath) => {
  if (window.location.hash === `#${toPath}`) {
    // If setting same hash, force hashchange trigger manually if needed
    window.location.hash = `#${toPath}`;
  } else {
    window.location.hash = `#${toPath}`;
  }
};

// Helper: Match route patterns like '/forms/:id' against actual path '/forms/123'
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

// Router Component: Renders matching route from routes array
const Router = ({ routes }) => {
  const currentPath = useHashRoute();

  let matchedComponent = null;
  let matchedParams = {};

  for (const route of routes) {
    const params = matchRoute(route.path, currentPath);
    if (params !== null) {
      matchedComponent = route.component;
      matchedParams = params;
      break;
    }
  }

  React.useEffect(() => {
    if (!matchedComponent) {
      navigate('/signin');
    }
  }, [currentPath, matchedComponent]);

  if (!matchedComponent) {
    return null;
  }

  const Component = matchedComponent;
  return <Component {...matchedParams} />;
};
