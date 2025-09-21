import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SummaryWrapper from "./pages/SummaryWrapper";
import InstrumentsPage from "./pages/InstrumentsPage";
// (pokud máš RevisionFormProvider, obal i tím – viz komentáře níž)

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        {/* Pokud používáš RevisionFormProvider, dej ho sem:
        <RevisionFormProvider> */}
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary/:revId"
              element={
                <ProtectedRoute>
                  <SummaryWrapper />
                </ProtectedRoute>
              }
            />
            <Route path="/instruments" element={<InstrumentsPage />} />
          </Routes>
        {/* </RevisionFormProvider> */}
      </UserProvider>
    </BrowserRouter>
  );
}
export default App;
