"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage(){
  const supabase = createClient();
  const [newPass,setNewPass]=useState("");
  const [msg,setMsg]=useState("");

  const handleChange = async (e:any)=>{
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if(error) setMsg(error.message);
    else setMsg("Password berhasil diganti!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfbf8] p-4">
      <form onSubmit={handleChange} className="bg-white p-8 rounded- border w-full max-w-md space-y-4">
        <h1 className="font-bold text-xl">Ganti Password</h1>
        <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Password baru min 6 karakter" className="w-full border rounded-2xl px-4 py-3 text-sm"/>
        <button className="w-full bg-zinc-900 text-white py-3 rounded-2xl text-sm">Simpan</button>
        {msg && <p className="text-sm text-center bg-zinc-100 p-3 rounded-xl">{msg}</p>}
      </form>
    </div>
  );
}