"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Schedule = any;

export default function GMDashboard(){
  const supabase = createClient();
  const [schedules,setSchedules]=useState<Schedule[]>([]);
  const [profiles,setProfiles]=useState<any[]>([]);
  const [filter,setFilter]=useState({ client:"", status:"", consultant:"" });
  const [tab,setTab]=useState<"all"|"pending">("all");
  const [search,setSearch]=useState("");
  const [selectedCard,setSelectedCard]=useState<null | { type: "pending"|"total"|"approved"|"conflict", title: string }>(null);

  const formatTanggalHari = (d: string) => {
    if(!d) return "-";
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const timeToMin = (t:string) => { const [h,m]=t.split(":").map(Number); return h*60+(m||0); };
  const isOverlapping = (a:any,b:any) => {
    if(a.id===b.id) return false;
    if(a.consultant_id!==b.consultant_id) return false;
    if(a.date!==b.date) return false;
    if(a.status==="REJECTED"||b.status==="REJECTED") return false;
    return timeToMin(a.start_time) < timeToMin(b.end_time) && timeToMin(b.start_time) < timeToMin(a.end_time);
  };

  const load = async ()=>{
    const { data: prof } = await supabase.from("profiles").select("*");
    setProfiles(prof||[]);
    const { data } = await supabase.from("schedules").select("*, profiles!inner(email, role)").order("date", { ascending:false }).limit(200);
    setSchedules(data||[]);
  };
  useEffect(()=>{ load(); }, []);

  const getEmail = (id:string) => profiles.find(p=>p.id===id)?.email || "-";
  const pending = schedules.filter(s=>s.status==="PENDING");
  const approved = schedules.filter(s=>s.status==="APPROVED");

  const conflictsList = (()=>{ const pairs:any[]=[]; for(let i=0;i<schedules.length;i++) for(let j=i+1;j<schedules.length;j++) if(isOverlapping(schedules[i],schedules[j])) pairs.push([schedules[i],schedules[j]]); return pairs; })();
  const conflictIds = new Set(conflictsList.flat().map((s:any)=>s.id));
  const conflictsCount = conflictsList.length;

  // grafik per konsultan
  const perKonsultan = (()=> {
    const map:any={};
    schedules.forEach(s=>{ const email = s.profiles?.email || getEmail(s.consultant_id); map[email]=(map[email]||0)+1; });
    return Object.entries(map).sort((a:any,b:any)=>b[1]-a[1]).slice(0,6);
  })();
  const maxCount = Math.max(...perKonsultan.map((p:any)=>p[1]),1);

  const filtered = schedules.filter(s=>{
    if(selectedCard?.type==="pending" && s.status!=="PENDING") return false;
    if(selectedCard?.type==="approved" && s.status!=="APPROVED") return false;
    if(selectedCard?.type==="conflict" &&!conflictIds.has(s.id)) return false;
    if(tab==="pending" &&!selectedCard && s.status!=="PENDING") return false;
    if(filter.status && s.status!==filter.status) return false;
    if(filter.consultant && s.consultant_id!==filter.consultant) return false;
    if(filter.client &&!s.client_name.toLowerCase().includes(filter.client.toLowerCase())) return false;
    if(search &&!`${s.client_name} ${s.project_name} ${s.profiles?.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const detailData = (()=> {
    if(!selectedCard) return [];
    if(selectedCard.type==="pending") return pending;
    if(selectedCard.type==="approved") return approved;
    if(selectedCard.type==="conflict") return Array.from(conflictIds).map(id=>schedules.find(s=>s.id===id)).filter(Boolean);
    return schedules;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-[#ecfdf5] to-[#d1fae5] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER PREMIUM GREEN */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 bg-white/80 backdrop-blur-xl p-6 rounded-[32px] border border-emerald-100 shadow-[0_20px_60px_-20px_rgba(16,185,129,0.3)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl">🌿</div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-emerald-950">GM Dashboard <span className="ml-2 text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">Premium</span></h1>
              <p className="text-sm text-emerald-700/60 mt-1">Jadwal Konsultan SPRINT • {formatTanggalHari(new Date().toISOString().slice(0,10))}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{ const h="Hari,Tanggal,Client,Project,Konsultan,Jam,Status\n"; const r=filtered.map(s=>`${new Date(s.date+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long"})},${s.date},${s.client_name},${s.project_name},${s.profiles?.email},${s.start_time}-${s.end_time},${s.status}`).join("\n"); const b=new Blob([h+r],{type:"text/csv"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download="jadwal.csv"; a.click(); }} className="px-5 py-2.5 bg-white border border-emerald-100 rounded-2xl text-sm font-medium hover:bg-emerald-50">↓ Export CSV</button>
            <button onClick={async()=>{ await supabase.auth.signOut(); location.href="/login"; }} className="px-5 py-2.5 bg-emerald-900 text-white rounded-2xl text-sm font-medium">Logout</button>
          </div>
        </div>

        {/* 4 CARD KLIKABLE - PREMIUM GREEN */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div onClick={()=>setSelectedCard({ type:"pending", title:"Butuh Approval - Menunggu Persetujuan" })} className="group cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-100 p-7 rounded-[32px] border border-amber-200/50 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(251,191,36,0.5)] hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-white text-xl shadow">🔔</div>
            <div className="mt-5 text-xs font-semibold text-amber-800/70 tracking-wide">Butuh Approval</div>
            <div className="text-5xl font-bold mt-1 text-amber-950">{pending.length}</div>
            <div className="text-xs text-amber-700/60 mt-2">Menunggu persetujuan • Klik untuk detail</div>
            <div className="mt-4 text-xs font-medium text-amber-800 group-hover:gap-2 flex items-center gap-1">Lihat detail →</div>
          </div>

          <div onClick={()=>setSelectedCard({ type:"total", title:"Semua Jadwal Bulan Ini" })} className="group cursor-pointer bg-white/80 backdrop-blur p-7 rounded-[32px] border border-emerald-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl">📅</div>
            <div className="mt-5 text-xs font-semibold text-emerald-800/50 tracking-wide">Jadwal Bulan Ini</div>
            <div className="text-5xl font-bold mt-1 text-emerald-950">{schedules.length}</div>
            <div className="text-xs text-emerald-600 mt-2">+{schedules.length} total • Klik untuk detail</div>
          </div>

          <div onClick={()=>setSelectedCard({ type:"approved", title:"Jadwal Selesai / Disetujui" })} className="group cursor-pointer bg-white/80 backdrop-blur p-7 rounded-[32px] border border-emerald-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-200 rounded-2xl flex items-center justify-center text-emerald-700 text-xl">✓</div>
            <div className="mt-5 text-xs font-semibold text-emerald-800/50 tracking-wide">Selesai</div>
            <div className="text-5xl font-bold mt-1 text-emerald-950">{approved.length}</div>
            <div className="text-xs text-emerald-600/70 mt-2">Bulan ini • Klik untuk detail</div>
          </div>

          <div onClick={()=>setSelectedCard({ type:"conflict", title:"Bentrok Terdeteksi - Jam Tumpang Tindih" })} className={`group cursor-pointer p-7 rounded-[32px] border shadow-sm hover:-translate-y-1 transition-all ${conflictsCount>0? "bg-gradient-to-br from-red-50 to-rose-100 border-red-200 hover:shadow-[0_20px_40px_-15px_rgba(239,68,68,0.4)]" : "bg-white/80 border-emerald-100"}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${conflictsCount>0? "bg-gradient-to-br from-red-500 to-rose-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>⚠</div>
            <div className="mt-5 text-xs font-semibold tracking-wide">Bentrok Terdeteksi</div>
            <div className="text-5xl font-bold mt-1">{conflictsCount}</div>
            <div className="text-xs mt-2">{conflictsCount>0? "Perlu dicek - jam tumpang tindih • Klik" : "Aman - tidak ada bentrok"}</div>
          </div>
        </div>

        {/* GRAFIK BATANG PER KONSULTAN - GREEN PREMIUM */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[32px] border border-emerald-100 shadow-sm p-8">
            <div className="flex justify-between items-start mb-8">
              <div><h2 className="text-2xl font-bold text-emerald-950">Jumlah Jadwal per Konsultan</h2><p className="text-sm text-emerald-700/50 mt-1">Total schedules - last 30 days • Tema Green Environment</p></div>
              <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">Live</span>
            </div>
            <div className="space-y-4">
              {perKonsultan.map(([email,count]:any)=>(
                <div key={email} className="group">
                  <div className="flex justify-between text-xs mb-2"><span className="font-medium text-emerald-900 truncate max-w-[200px]">{email}</span><span className="font-bold">{count}</span></div>
                  <div className="h-3 bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-700 rounded-full transition-all duration-1000" style={{ width: `${(count/maxCount)*100}%` }}></div>
                  </div>
                </div>
              ))}
              {perKonsultan.length===0 && <p className="text-sm text-zinc-400">Belum ada data</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900 to-green-800 rounded-[32px] p-8 text-white shadow-[0_20px_60px_-20px_rgba(16,185,129,0.6)]">
            <h3 className="font-bold text-lg">🌱 Insights</h3>
            <div className="mt-6 space-y-4">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4"><div className="text-xs text-emerald-100/60">Top Konsultan</div><div className="font-bold mt-1">{perKonsultan[0]?.[0]?.split("@")[0] || "-"}</div><div className="text-xs mt-1 text-emerald-100">{perKonsultan[0]?.[1] || 0} jadwal</div></div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4"><div className="text-xs text-emerald-100/60">Peak Day</div><div className="font-bold mt-1">Senin</div><div className="text-xs mt-1 text-emerald-100">Paling banyak jadwal</div></div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4"><div className="text-xs text-emerald-100/60">Completion</div><div className="font-bold mt-1">{schedules.length>0? Math.round(approved.length/schedules.length*100) : 0}%</div><div className="w-full h-1.5 bg-white/20 rounded-full mt-2"><div className="h-full bg-emerald-300 rounded-full" style={{ width: `${schedules.length>0? approved.length/schedules.length*100 : 0}%` }}></div></div></div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[32px] border border-emerald-100 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button onClick={()=>{setTab("pending"); setSelectedCard(null);}} className={`px-5 py-2.5 rounded-2xl text-sm font-medium ${tab==="pending" &&!selectedCard? "bg-emerald-900 text-white" : "bg-emerald-50 text-emerald-700"}`}>Butuh Approval ({pending.length})</button>
              <button onClick={()=>{setTab("all"); setSelectedCard(null);}} className={`px-5 py-2.5 rounded-2xl text-sm font-medium ${tab==="all" &&!selectedCard? "bg-emerald-900 text-white" : "bg-emerald-50 text-emerald-700"}`}>Semua Jadwal</button>
              {selectedCard && <button onClick={()=>setSelectedCard(null)} className="px-5 py-2.5 rounded-2xl text-sm bg-red-50 text-red-600">✕ Clear Filter: {selectedCard.title}</button>}
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari konsultan, client, project..." className="border border-emerald-100 rounded-2xl px-4 py-2.5 text-sm w-full lg:max-w-sm focus:ring-2 focus:ring-emerald-500 outline-none"/>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-emerald-50">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50/50 text-[11px] uppercase tracking-wider text-emerald-800/60"><tr><th className="text-left py-3 px-4">Tanggal</th><th className="text-left py-3 px-4">Konsultan</th><th className="text-left py-3 px-4">Client</th><th className="text-left py-3 px-4">Jam</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Aksi</th></tr></thead>
              <tbody>
                {filtered.map(s=>{
                  const isConflict = conflictIds.has(s.id);
                  return (
                  <tr key={s.id} className={`border-t border-emerald-50 hover:bg-emerald-50/50 ${isConflict? "bg-red-50/70" : ""}`}>
                    <td className="py-4 px-4"><div className="font-semibold text-emerald-950">{formatTanggalHari(s.date)} {isConflict && <span className="ml-1 text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">BENTROK</span>}</div><div className="text-[11px] text-zinc-400">{s.date}</div></td>
                    <td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-emerald-900 text-white flex items-center justify-center text-[10px] font-bold">{s.profiles?.email?.slice(0,2).toUpperCase()}</div><span className="text-xs">{s.profiles?.email}</span></div></td>
                    <td className="py-4 px-4"><div className="font-medium">{s.client_name}</div><div className="text-xs text-zinc-500">{s.project_name}</div></td>
                    <td className="py-4 px-4 text-xs">{s.start_time}-{s.end_time} <span className="ml-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px]">{s.location}</span></td>
                    <td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${s.status==="PENDING"?"bg-amber-100 text-amber-800":s.status==="APPROVED"?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>{s.status}</span></td>
                    <td className="py-4 px-4 flex gap-1"><button onClick={async()=>{ await supabase.from("schedules").update({ status:"APPROVED" }).eq("id", s.id); load(); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs">Approve</button><button onClick={async()=>{ const r=prompt("Alasan?"); if(r!==null){ await supabase.from("schedules").update({ status:"REJECTED", rejection_reason:r }).eq("id", s.id); load(); } }} className="px-3 py-1.5 bg-white border text-red-600 rounded-xl text-xs">Reject</button></td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL KLIK CARD */}
      {selectedCard && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setSelectedCard(null)}>
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-emerald-100" onClick={e=>e.stopPropagation()}>
            <div className="p-8 border-b border-emerald-50 bg-gradient-to-br from-emerald-50 to-green-50">
              <div className="flex justify-between items-start">
                <div><h2 className="text-2xl font-bold text-emerald-950">{selectedCard.title}</h2><p className="text-sm text-emerald-700/60 mt-1">{detailData.length} jadwal ditemukan</p></div>
                <button onClick={()=>setSelectedCard(null)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow">✕</button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh] space-y-3">
              {detailData.map((s:any)=>(
                <div key={s.id} className="p-4 rounded-2xl border border-emerald-50 bg-emerald-50/30 flex justify-between items-center">
                  <div><div className="font-bold text-sm">{s.client_name} - {s.project_name}</div><div className="text-xs text-zinc-500 mt-1">{formatTanggalHari(s.date)} • {s.start_time}-{s.end_time} • {s.profiles?.email}</div></div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full ${s.status==="PENDING"?"bg-amber-100 text-amber-800":s.status==="APPROVED"?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>{s.status}</span>
                </div>
              ))}
              {detailData.length===0 && <p className="text-center text-zinc-400 py-10">Tidak ada data untuk kategori ini</p>}
            </div>
            <div className="p-6 border-t bg-zinc-50 flex gap-3"><button onClick={()=>setSelectedCard(null)} className="flex-1 border py-3 rounded-2xl text-sm">Tutup</button><button onClick={()=>{ setSelectedCard(null); document.getElementById("table")?.scrollIntoView(); }} className="flex-1 bg-emerald-900 text-white py-3 rounded-2xl text-sm">Lihat di Tabel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}