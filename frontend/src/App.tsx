import { BrowserRouter, Route, Routes } from 'react-router';
import HomePage from './Pages/HomePage';
import LoginPage from './Pages/LoginPage';
import SignupPage from './Pages/SignupPage';
import Navbar from './Components/Navbar';
import DashboardPage from './Pages/DashboardPage';
import AuthenticatedRoute from './Components/AuthenticatedRoute';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<AuthenticatedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
