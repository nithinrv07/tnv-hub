import { Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import NotFound from './pages/NotFound.jsx';

// Routes from Frontend Spec section 2. Screens not built yet render ComingSoon.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<ComingSoon title="Register as Volunteer" />} />
        <Route path="/register/payment" element={<ComingSoon title="Membership payment" />} />
        <Route path="/login" element={<ComingSoon title="Log in" />} />
        <Route path="/forgot-password" element={<ComingSoon title="Forgot password" />} />
        <Route path="/reset-password" element={<ComingSoon title="Reset password" />} />
        <Route path="/donate" element={<ComingSoon title="Donate" />} />
        <Route path="/dashboard" element={<ComingSoon title="Your dashboard" />} />
        <Route path="/admin" element={<ComingSoon title="Applicant queue" />} />
        <Route path="/admin/applicants/:id" element={<ComingSoon title="Applicant review" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
