"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <button className="profile-logout" onClick={logout} type="button">
      Log out
    </button>
  );
}
