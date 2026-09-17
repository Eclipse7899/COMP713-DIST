import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import HomePage from './Pages/HomePage.tsx';
import LoginPage from './Pages/LoginPage.tsx';
import SignupPage from './Pages/SignupPage.tsx';
import Navbar from './Components/Navbar.tsx';
import DashboardPage from './Pages/DashboardPage.tsx';
import ProtectedRoute from './Components/AuthenticatedRoute.tsx';

function App() {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path="/" element={<HomePage/>}/>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/signup" element={<SignupPage/>}/>
        <Route element={<ProtectedRoute/>}>
          <Route path="/dashboard" element={<DashboardPage/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
