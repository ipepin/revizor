export type User = {
  id: number;
  name: string;
};

export async function loginUser(email: string, _password?: string) {
  const user = { id: 1, name: email };
  localStorage.setItem("user-session", JSON.stringify({ user, timestamp: Date.now() }));
  return user;
}

export function logout() {
  console.log("Odhlášení...");
  localStorage.removeItem("session");  // místo "user"
}

export function getCurrentUser(): User | null {
  const session = localStorage.getItem("user-session");
  if (!session) return null;
  try {
    const { user, timestamp } = JSON.parse(session);
    if (Date.now() - timestamp > 30 * 60 * 1000) {
      localStorage.removeItem("user-session");
      return null;
    }
    return user;
  } catch (e) {
    console.warn("Neplatná session v localStorage");
    return null;
  }
}
