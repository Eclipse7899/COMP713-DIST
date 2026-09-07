import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import HomePage from './Pages/HomePage.tsx';
import LoginPage from './Pages/LoginPage.tsx';
import SignupPage from './Pages/SignupPage.tsx';
import Navbar from './Components/Navbar.tsx';
import DashboardPage from './Pages/DashboardPage.tsx';

function App() {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path="/" element={<HomePage/>}/>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/signup" element={<SignupPage/>}/>
        <Route path="/dashboard" element={<DashboardPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
