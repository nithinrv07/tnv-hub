import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Google Translate wraps text nodes in <font> tags. When React later updates or
// removes one of those nodes, the browser throws "not a child of this node" and the
// app crashes. Fall back to a no-op in that case (facebook/react#11538).
if (typeof Node === 'function' && Node.prototype) {
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child);
  };
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, ref) {
    if (ref && ref.parentNode !== this) return newNode;
    return insertBefore.call(this, newNode, ref);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
