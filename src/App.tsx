import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Scratchcard from './pages/Scratchcard';
import Admin from './pages/Admin';
import QRCodePage from './pages/QRCodePage';
import Layout from './components/Layout';

export default function App() {
  return (
    <>
      <Toaster theme="dark" position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="scratchcard" element={<Scratchcard />} />
        </Route>
        <Route path="/admin" element={<Admin />} />
        <Route path="/qr" element={<QRCodePage />} />
      </Routes>
    </>
  );
}
