import { Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Soon from './components/Soon';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Soon name="Landing page" />} />
      <Route path="/login" element={<Soon name="Login" />} />
      <Route path="/register" element={<Soon name="Register" />} />
      <Route path="/pay/:reference" element={<Soon name="Payment page" />} />
      <Route path="/handover/:token" element={<Soon name="Rider handover" />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Soon name="Dashboard" />} />
        <Route path="/orders/new" element={<Soon name="Create escrow" />} />
        <Route path="/orders/:id" element={<Soon name="Order detail" />} />
        <Route path="/settings" element={<Soon name="Settings" />} />
      </Route>

      <Route element={<RequireAuth role="admin" />}>
        <Route path="/admin" element={<Soon name="Admin" />} />
      </Route>

      <Route path="*" element={<Soon name="Page not found" />} />
    </Routes>
  );
}