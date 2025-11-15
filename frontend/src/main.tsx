import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Debug: Check if element exists
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

try {
  const root = createRoot(rootElement);
  console.log('Root created successfully');

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('Render called successfully');
} catch (error) {
  console.error('Render error:', error);
  document.body.innerHTML = `<h1>Error: ${error}</h1>`;
}
