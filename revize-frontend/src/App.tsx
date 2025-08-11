import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SummaryPage from "./pages/SummaryPage";
import SummaryWrapper from "./pages/SummaryWrapper";

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
        <Route path="/summary/:revId" element={<SummaryWrapper />} />      </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}