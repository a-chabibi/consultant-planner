"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage(){
  const [email,setEmail]=useState("gm@company.com");
  const [password,setPassword]=useState("Admin123!");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e:any)=>{
    e.preventDefault(); setLoading(true); setMsg("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){ setMsg(error.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    setLoading(false);
    if(profile?.role==="GM") router.push("/gm-dashboard");
    else router.push("/dashboard");
  };

  const handleSignUp = async ()=>{
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if(error) setMsg(error.message);
    else setMsg("Akun berhasil dibuat! Sekarang klik Login.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfbf8] p-4">
      <div className="w-full max-w-md bg-white rounded- shadow-xl border border-zinc-200 p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Consultant Planner</h1>
        <p className="text-sm text-zinc-600 mt-1">Masuk pakai akun Supabase</p>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-zinc-900">
          <b>Akun GM Seed:</b><br/>gm@company.com / Admin123!
        </div>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-zinc-900"/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-zinc-900"/>
          <button disabled={loading} className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold">{loading?"Loading...":"Login"}</button>
        </form>
        <button onClick={handleSignUp} className="w-full mt-3 bg-white border border-zinc-300 py-3 rounded-xl font-medium text-zinc-900">Daftar Akun Baru</button>
        {msg && <p className="mt-4 text-sm text-center p-3 bg-zinc-100 rounded-xl text-zinc-900">{msg}</p>}
      </div>
    </div>
  );
}