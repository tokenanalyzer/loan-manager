/**
 * Application entry point.
 *
 * Phase 1 scope: build/bootstrap wiring only. No application UI,
 * routing, or pages are implemented yet — that begins in a later phase.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    React.createElement(React.StrictMode, null),
  );
}
