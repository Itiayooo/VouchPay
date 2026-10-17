import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Soon from './components/Soon';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import CreateOrder from './pages/CreateOrder';
import Settings from './pages/Settings';
import PayPage from './pages/PayPage';
import Track from './pages/Track';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pay/:reference" element={<PayPage />} />
      <Route path="/track" element={<Track />} />
      <Route path="/handover/:token" element={<Soon name="Rider handover" />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders/new" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<Soon name="Order detail" />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="admin" />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<Soon name="Admin" />} />
        </Route>
      </Route>

      <Route path="*" element={<Soon name="Page not found" />} />
    </Routes>
  );
}