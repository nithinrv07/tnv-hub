import { Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import Payment from './pages/Payment.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Donate from './pages/Donate.jsx';
import Events from './pages/Events.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import AdminReview from './pages/AdminReview.jsx';
import ManageQuestions from './pages/ManageQuestions.jsx';
import Policy from './pages/Policy.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public / Civic Marketing Shell with TopBar, Brand Header & Footer */}
      <Route element={<AppShell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/payment" element={<Payment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/events" element={<Events />} />
        <Route path="/terms-conditions" element={<Policy slug="terms-conditions" />} />
        <Route path="/refund-policy" element={<Policy slug="refund-policy" />} />
        <Route path="/privacy-policy" element={<Policy slug="privacy-policy" />} />
      </Route>

      {/* Autonomous Full-Screen Portals (Self-contained sidebars, top headers & workbenches) */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/queue" element={<Admin />} />
      <Route path="/admin/applicants/:id" element={<AdminReview />} />
      <Route path="/admin/questions" element={<ManageQuestions />} />
      <Route path="/admin/events" element={<Admin />} />

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
