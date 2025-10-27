import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error boundary for debugging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Render the app
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
}

