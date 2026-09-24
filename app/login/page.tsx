"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
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
        {/* LOGO SPRINT */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-zinc-900 text-white rounded-xl flex items-center justify-center font-bold text-xl">S</div>
          {/* Kalau punya logo asli, ganti div diatas dengan: <img src="/logo.png" alt="SPRINT" className="w-14 h-14 object-contain" /> */}
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 text-center">Jadwal Konsultan SPRINT</h1>
        <p className="text-sm text-zinc-500 text-center mt-1">Masuk untuk melanjutkan</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-2xl border border-zinc-300 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 rounded-2xl border border-zinc-300 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"/>
          <button disabled={loading} className="w-full bg-zinc-900 text-white py-3 rounded-2xl font-semibold disabled:opacity-50">{loading?"Loading...":"Login"}</button>
        </form>
        <button onClick={handleSignUp} disabled={loading} className="w-full mt-3 bg-white border border-zinc-300 py-3 rounded-2xl font-medium text-zinc-900 text-sm hover:bg-zinc-50">Daftar Akun Baru</button>
        {msg && <p className="mt-4 text-sm text-center p-3 bg-zinc-100 rounded-2xl text-zinc-900">{msg}</p>}
      </div>
    </div>
  );
}