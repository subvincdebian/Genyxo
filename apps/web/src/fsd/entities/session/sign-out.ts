export function signOutSession() {
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
