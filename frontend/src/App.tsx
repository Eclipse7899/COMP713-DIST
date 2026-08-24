import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import HomePage from './Pages/HomePage.tsx';
import LoginPage from './Pages/LoginPage.tsx';
import SignupPage from './Pages/SignupPage.tsx';
import Navbar from './Components/Navbar.tsx';

function App() {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path="/" element={<HomePage/>}/>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/signup" element={<SignupPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
