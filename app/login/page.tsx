"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("khaled.aun@gmail.com");
  const [password, setPassword] = useState("12341234");
  const params = useSearchParams();
  const error = params.get("error");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
    // NextAuth handles redirects; errors will bounce back with ?error=CredentialsSignin
    console.log(res);
  }

  return (
    <main style={{maxWidth: 420, margin: "5rem auto", fontFamily: "ui-sans-serif"}}>
      <h1 style={{fontSize: 24, fontWeight: 600, marginBottom: 16}}>Sign in</h1>
      {error && <p style={{color: "crimson"}}>Sign in failed. Check your email/password.</p>}
      <form onSubmit={onSubmit} style={{display:"grid", gap: 12}}>
        <label>
          <div>Email</div>
          <input
            name="email"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            style={{width:"100%", padding:8, border:"1px solid #ccc", borderRadius:8}}
            autoComplete="username"
          />
        </label>
        <label>
          <div>Password</div>
          <input
            name="password"
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            style={{width:"100%", padding:8, border:"1px solid #ccc", borderRadius:8}}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" style={{padding:"10px 14px", borderRadius:8}}>
          Sign in
        </button>
      </form>
    </main>
  );
}
