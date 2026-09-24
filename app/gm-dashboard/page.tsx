"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Schedule = any;

export default function GMDashboard(){
  const supabase = createClient();
  const [schedules,setSchedules]=useState<Schedule[]>([]);
  const [profiles,setProfiles]=useState<any[]>([]);
  const [filter,setFilter]=useState({ client:"", status:"", consultant:"" });
  const [tab,setTab]=useState<"all"|"pending">("pending");

  const formatTanggalHari = (dateStr: string) => {
    if(!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const formatTanggalHariPendek = (dateStr: string) => {
    if(!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const load = async ()=>{
    const { data: prof } = await supabase.from("profiles").select("*");
    setProfiles(prof||[]);
    let query = supabase.from("schedules").select("*, profiles!inner(email, role)").order("date", { ascending:false });
    const { data } = await query.limit(200);
    setSchedules(data||[]);
  };
  useEffect(()=>{ load(); }, []);

  const pending = schedules.filter(s=>s.status==="PENDING");
  const conflicts = (()=>{ const map:any={}; schedules.forEach(s=>{ if(s.status==="REJECTED") return; const key=s.consultant_id+"_"+s.date; map[key]=(map[key]||0)+1; }); return Object.values(map).filter((v:any)=>v>1).length; })();

  const filtered = schedules.filter(s=>{
    if(tab==="pending" && s.status!=="PENDING") return false;
    if(filter.client &&!s.client_name.toLowerCase().includes(filter.client.toLowerCase())) return false;
    if(filter.status && s.status!==filter.status) return false;
    if(filter.consultant && s.consultant_id!==filter.consultant) return false;
    return true;
  });

  const exportCSV = ()=>{
    const header = "Hari,Tanggal,Client,Project,Konsultan,Lokasi,Jam,Status\n";
    const rows = filtered.map(s=>{
      const d = new Date(s.date + "T00:00:00");
      const hari = d.toLocaleDateString("id-ID", { weekday: "long" });
      return `${hari},${s.date},${s.client_name},${s.project_name},${s.profiles?.email},${s.location},${s.start_time}-${s.end_time},${s.status}`;
    }).join("\n");
    const blob = new Blob([header+rows], { type:"text/csv" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="jadwal.csv"; a.click();
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">GM Dashboard</h1>
          <div className="flex gap-2"><button onClick={exportCSV} className="px-4 py-2 bg-white border rounded-xl text-sm">Export CSV</button><button onClick={async()=>{ await supabase.auth.signOut(); location.href="/login"; }} className="px-4 py-2 bg-white border rounded-xl">Logout</button></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded- border"><div className="text-xs text-zinc-500">Total Konsultan</div><div className="text-2xl font-bold">{profiles.filter(p=>p.role==="CONSULTANT").length}</div></div>
          <div className="bg-white p-5 rounded- border"><div className="text-xs text-zinc-500">Jadwal Bulan Ini</div><div className="text-2xl font-bold">{schedules.length}</div></div>
          <div className="bg-amber-50 p-5 rounded- border border-amber-200"><div className="text-xs text-amber-700">Butuh Approval</div><div className="text-2xl font-bold text-amber-700">{pending.length}</div></div>
          <div className="bg-red-50 p-5 rounded- border border-red-200"><div className="text-xs text-red-700">Bentrok Terdeteksi</div><div className="text-2xl font-bold text-red-700">{conflicts}</div></div>
        </div>

        <div className="bg-white rounded- border p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <button onClick={()=>setTab("pending")} className={`px-4 py-2 rounded-xl text-sm ${tab==="pending"?"bg-zinc-900 text-white":"bg-zinc-100"}`}>Butuh Approval ({pending.length})</button>
            <button onClick={()=>setTab("all")} className={`px-4 py-2 rounded-xl text-sm ${tab==="all"?"bg-zinc-900 text-white":"bg-zinc-100"}`}>Semua Jadwal</button>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <input value={filter.client} onChange={e=>setFilter({...filter, client:e.target.value})} placeholder="Filter client..." className="border rounded-xl px-3 py-2 text-sm"/>
            <select value={filter.status} onChange={e=>setFilter({...filter, status:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"><option value="">Semua Status</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select>
            <select value={filter.consultant} onChange={e=>setFilter({...filter, consultant:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"><option value="">Semua Konsultan</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.email}</option>)}</select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500"><tr><th className="text-left py-2 min-w-">Tanggal</th><th className="text-left">Konsultan</th><th className="text-left">Client</th><th className="text-left">Project</th><th className="text-left">Jam</th><th className="text-left">Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id} className="border-t">
                    <td className="py-3">
                      <div className="font-medium">{formatTanggalHari(s.date)}</div>
                      <div className="text- text-zinc-400">{s.date}</div>
                    </td>
                    <td>{s.profiles?.email}</td>
                    <td className="font-medium">{s.client_name}</td>
                    <td>{s.project_name}</td>
                    <td>{s.start_time}-{s.end_time} {s.location}</td>
                    <td><span className={`px-2 py-1 rounded-full text-xs ${s.status==="PENDING"?"bg-yellow-100 text-yellow-800":s.status==="APPROVED"?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{s.status}</span></td>
                    <td className="flex gap-1">
                      <button onClick={async()=>{ await supabase.from("schedules").update({ status:"APPROVED", rejection_reason:null }).eq("id", s.id); load(); }} className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs">Approve</button>
                      <button onClick={async()=>{ const reason = prompt("Alasan reject?"); if(reason!==null){ await supabase.from("schedules").update({ status:"REJECTED", rejection_reason:reason }).eq("id", s.id); load(); } }} className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}