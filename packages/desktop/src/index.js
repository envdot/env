import React from 'react';
import ReactDOM from 'react-dom/client';
import { PlatformProvider, setPlatformAdapter, initPlatformListeners } from '@env/shared';
import { DesktopPlatformAdapter } from './DesktopPlatformAdapter';
import App from '@env/shared/src/App';
import '@env/shared/src/styles/App.css';

// Initialize platform adapter before anything else
const adapter = new DesktopPlatformAdapter();
setPlatformAdapter(adapter);
initPlatformListeners();

const root = ReactDOM.createRoot(document.getElementById('root'));

if (process.env.NODE_ENV === 'development') {
  root.render(
    <React.StrictMode>
      <PlatformProvider adapter={adapter}>
        <App />
      </PlatformProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <PlatformProvider adapter={adapter}>
      <App />
    </PlatformProvider>
  );
}
