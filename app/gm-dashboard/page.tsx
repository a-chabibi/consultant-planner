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
  const [search,setSearch]=useState("");
  const [approving,setApproving]=useState<string | null>(null);

  const formatTanggalHari = (dateStr: string) => {
    if(!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const getInitials = (email:string) => email? email.slice(0,2).toUpperCase() : "??";

  const load = async ()=>{
    const { data: prof } = await supabase.from("profiles").select("*");
    setProfiles(prof||[]);
    const { data } = await supabase.from("schedules").select("*, profiles!inner(email, role)").order("date", { ascending:false }).limit(200);
    setSchedules(data||[]);
  };
  useEffect(()=>{ load(); }, []);

  const pending = schedules.filter(s=>s.status==="PENDING");
  const approved = schedules.filter(s=>s.status==="APPROVED");
  const conflicts = (()=>{ const map:any={}; schedules.forEach(s=>{ if(s.status==="REJECTED") return; const key=s.consultant_id+"_"+s.date; map[key]=(map[key]||0)+1; }); return Object.values(map).filter((v:any)=>v>1).length; })();

  const filtered = schedules.filter(s=>{
    if(tab==="pending" && s.status!=="PENDING") return false;
    if(filter.status && s.status!==filter.status) return false;
    if(filter.consultant && s.consultant_id!==filter.consultant) return false;
    if(filter.client &&!s.client_name.toLowerCase().includes(filter.client.toLowerCase())) return false;
    if(search){
      const q = search.toLowerCase();
      if(!(`${s.client_name} ${s.project_name} ${s.profiles?.email}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const handleApprove = async (id:string)=>{
    setApproving(id);
    await supabase.from("schedules").update({ status:"APPROVED", rejection_reason:null }).eq("id", id);
    await load(); setApproving(null);
  };
  const handleReject = async (id:string)=>{
    const reason = prompt("Alasan reject?");
    if(reason===null) return;
    setApproving(id);
    await supabase.from("schedules").update({ status:"REJECTED", rejection_reason:reason }).eq("id", id);
    await load(); setApproving(null);
  };
  const handleBulkApprove = async ()=>{
    if(!confirm(`Approve ${filtered.length} jadwal pending sekaligus?`)) return;
    await supabase.from("schedules").update({ status:"APPROVED" }).in("id", filtered.map(f=>f.id));
    load();
  };

  const exportCSV = ()=>{
    const header = "Hari,Tanggal,Client,Project,Konsultan,Lokasi,Jam,Status\n";
    const rows = filtered.map(s=>{
      const hari = new Date(s.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" });
      return `${hari},${s.date},${s.client_name},${s.project_name},${s.profiles?.email},${s.location},${s.start_time}-${s.end_time},${s.status}`;
    }).join("\n");
    const blob = new Blob([header+rows], { type:"text/csv" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="jadwal.csv"; a.click();
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GM Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">Jadwal Konsultan SPRINT • {formatTanggalHari(new Date().toISOString().slice(0,10))}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-4 py-2.5 bg-white border rounded-2xl text-sm font-medium hover:bg-zinc-50">↓ Export CSV</button>
            <button onClick={async()=>{ await supabase.auth.signOut(); location.href="/login"; }} className="px-4 py-2.5 bg-zinc-900 text-white rounded-2xl text-sm font-medium">Logout</button>
          </div>
        </div>

        {/* STATS CARDS - MODERN */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#fef3c7] p-6 rounded-[24px] border border-amber-200 relative overflow-hidden">
            <div className="w-10 h-10 bg-amber-300 rounded-full flex items-center justify-center text-lg">🔔</div>
            <div className="mt-4 text-xs text-amber-800 font-medium">Butuh Approval</div>
            <div className="text-4xl font-bold mt-1">{pending.length}</div>
            <div className="text-xs text-amber-700/70 mt-1">Menunggu persetujuan</div>
          </div>
          <div className="bg-white p-6 rounded-[24px] border shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">📅</div>
            <div className="mt-4 text-xs text-zinc-500 font-medium">Jadwal Bulan Ini</div>
            <div className="text-4xl font-bold mt-1">{schedules.length}</div>
            <div className="text-xs text-emerald-600 mt-1">+{schedules.length} total</div>
          </div>
          <div className="bg-white p-6 rounded-[24px] border shadow-sm">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg">✓</div>
            <div className="mt-4 text-xs text-zinc-500 font-medium">Selesai</div>
            <div className="text-4xl font-bold mt-1">{approved.length}</div>
            <div className="text-xs text-zinc-400 mt-1">Bulan ini</div>
          </div>
          <div className="bg-[#fecaca] p-6 rounded-[24px] border border-red-200 relative overflow-hidden">
            <div className="w-10 h-10 bg-red-400 text-white rounded-full flex items-center justify-center text-lg">⚠</div>
            <div className="mt-4 text-xs text-red-800 font-medium">Bentrok Terdeteksi</div>
            <div className="text-4xl font-bold mt-1">{conflicts}</div>
            <div className="text-xs text-red-700/70 mt-1">Perlu dicek</div>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-[24px] border shadow-sm p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button onClick={()=>setTab("pending")} className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition ${tab==="pending"?"bg-zinc-900 text-white shadow":"bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>Butuh Approval ({pending.length})</button>
              <button onClick={()=>setTab("all")} className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition ${tab==="all"?"bg-zinc-900 text-white shadow":"bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>Semua Jadwal</button>
            </div>
            <div className="flex gap-2 flex-1 lg:justify-end">
              <div className="relative flex-1 lg:max-w-sm">
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari konsultan, client, project..." className="w-full border rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"/>
                <span className="absolute left-3.5 top-3 text-zinc-400">⌕</span>
              </div>
              {tab==="pending" && filtered.length>1 && (
                <button onClick={handleBulkApprove} className="px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-medium hover:bg-emerald-700">Approve {filtered.length} Sekaligus</button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <select value={filter.status} onChange={e=>setFilter({...filter, status:e.target.value})} className="border rounded-xl px-3 py-2 text-sm bg-zinc-50"><option value="">Semua Status</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select>
            <select value={filter.consultant} onChange={e=>setFilter({...filter, consultant:e.target.value})} className="border rounded-xl px-3 py-2 text-sm bg-zinc-50"><option value="">Semua Konsultan</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.email}</option>)}</select>
            <input value={filter.client} onChange={e=>setFilter({...filter, client:e.target.value})} placeholder="Filter client..." className="border rounded-xl px-3 py-2 text-sm bg-zinc-50"/>
          </div>

          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500"><tr><th className="text-left py-3 px-4 font-semibold">Tanggal</th><th className="text-left py-3 px-4 font-semibold">Konsultan</th><th className="text-left py-3 px-4 font-semibold">Client</th><th className="text-left py-3 px-4 font-semibold">Project</th><th className="text-left py-3 px-4 font-semibold">Jam</th><th className="text-left py-3 px-4 font-semibold">Status</th><th className="text-left py-3 px-4 font-semibold">Aksi</th></tr></thead>
              <tbody>
                {filtered.map(s=>(
                  <tr key={s.id} className="border-t hover:bg-zinc-50/70 transition">
                    <td className="py-4 px-4 min-w-[210px]">
                      <div className="font-semibold text-zinc-900">{formatTanggalHari(s.date)}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{s.date}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">{getInitials(s.profiles?.email)}</div>
                        <span className="text-xs truncate max-w-[140px]">{s.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium">{s.client_name}</td>
                    <td className="py-4 px-4 text-zinc-600">{s.project_name}</td>
                    <td className="py-4 px-4"><span className="text-xs">{s.start_time}-{s.end_time}</span><span className="ml-2 text-[10px] px-2 py-0.5 bg-zinc-100 rounded-full">{s.location}</span></td>
                    <td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${s.status==="PENDING"?"bg-yellow-100 text-yellow-800":s.status==="APPROVED"?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>{s.status}</span></td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1.5">
                        <button disabled={approving===s.id} onClick={()=>handleApprove(s.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                        <button disabled={approving===s.id} onClick={()=>handleReject(s.id)} className="px-3 py-1.5 bg-white border text-red-600 rounded-xl text-xs font-medium hover:bg-red-50 disabled:opacity-50">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={7} className="py-16 text-center text-zinc-400">Gak ada jadwal yang cocok filter</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}