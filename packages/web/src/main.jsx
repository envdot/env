import React from 'react';
import ReactDOM from 'react-dom/client';
import { PlatformProvider, setPlatformAdapter, initPlatformListeners } from '@env/shared';
import { WebPlatformAdapter } from './WebPlatformAdapter';
import App from '@env/shared/src/App';
import '@env/shared/src/styles/App.css';

// Initialize platform adapter before anything else
const adapter = new WebPlatformAdapter();
setPlatformAdapter(adapter);
initPlatformListeners();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <PlatformProvider adapter={adapter}>
      <App />
    </PlatformProvider>
  </React.StrictMode>
);
