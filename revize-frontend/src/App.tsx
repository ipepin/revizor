import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          {/* další routy */}
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}