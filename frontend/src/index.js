import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/responsive.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// React.StrictMode intentionally double-invokes effects in development to help detect side effects.
// This causes useEffect hooks to run twice, resulting in duplicate API calls and WebSocket connections.
// This behavior is NORMAL in development mode and does NOT occur in production builds.
// 
// To temporarily disable StrictMode for cleaner logs during development, 
// replace the render block below with this:
// root.render(<App />);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);