export async function signOutSession() {
  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      await fetch("/api/profile/logout", {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* Local sign-out still works when the network is unavailable. */
    }
  }
  for (const key of [
    "authToken",
    "userName",
    "userEmail",
    "userAvatar",
    "userCredits",
    "userRole",
    "userId",
  ])
    localStorage.removeItem(key);
  document.dispatchEvent(new Event("genyxo:session"));
  window.location.replace(new URL("/sign-in", window.location.origin).href);
}
