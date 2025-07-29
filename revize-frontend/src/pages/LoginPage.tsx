// src/pages/LoginPage.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useUser } from "../context/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, login } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // ✅ Pokud už je uživatel přihlášený, rovnou přesměruj na dashboard
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginUser(email, password);
      login(data); // uloží uživatele do contextu i localStorage
      navigate("/");
    } catch (err) {
      setError("Přihlášení selhalo");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <form className="bg-white p-6 rounded shadow w-80" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold mb-4 text-center">Přihlášení</h2>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Heslo"
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Přihlásit se
        </button>
      </form>
    </div>
  );
}
