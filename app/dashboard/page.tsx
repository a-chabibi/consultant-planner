"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Schedule = {
  id:string; consultant_id:string; client_name:string; project_name:string;
  location:"WFO"|"WFH"|"On-site"|"Leave"; task_description:string;
  date:string; start_time:string; end_time:string; status:"PENDING"|"APPROVED"|"REJECTED"; rejection_reason?:string;
};

export default function Dashboard(){
  const supabase = createClient();
  const [schedules,setSchedules]=useState<Schedule[]>([]);
  const [currentMonth,setCurrentMonth]=useState(new Date());
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<Schedule|null>(null);
  const [conflictWarning,setConflictWarning]=useState<{conflicts: any[], dates: string[]} | null>(null);
  const [form,setForm]=useState({ client_name:"", project_name:"", location:"WFO" as any, task_description:"", start_time:"09:00", end_time:"17:00" });
  const [userEmail,setUserEmail]=useState("");
  const [isSaving,setIsSaving]=useState(false);
  const [repeatCount,setRepeatCount]=useState(1);
  const [skipWeekend,setSkipWeekend]=useState(true);

  // helper anti-timezone-bug
  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };
  const timeToMin = (t:string) => {
    if(!t) return 0;
    const [h,m] = t.split(":").map(Number);
    return h*60 + (m||0);
  };
  const isOverlapping = (a:any, b:any) => {
    if(a.date!==b.date) return false;
    if(a.id===b.id) return false;
    if(a.status==="REJECTED" || b.status==="REJECTED") return false;
    const sA = timeToMin(a.start_time), eA = timeToMin(a.end_time);
    const sB = timeToMin(b.start_time), eB = timeToMin(b.end_time);
    return sA < eB && sB < eA;
  };
  const hasOverlapInList = (list:any[]) => {
    for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++) if(isOverlapping(list[i], list[j])) return true;
    return false;
  };

  const formatTanggalHari = (dateStr:string) => {
    if(!dateStr) return "-";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  };
  const formatPendek = (dateStr:string) => {
    if(!dateStr) return "-";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday:"short", day:"numeric", month:"short" });
  };

  const load = async ()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    setUserEmail(user.email||"");
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const start = `${y}-${String(m+1).padStart(2,"0")}-01`;
    const lastDay = new Date(y, m+1, 0).getDate();
    const end = `${y}-${String(m+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
    const { data } = await supabase.from("schedules").select("*").gte("date", start).lte("date", end).order("date", { ascending:true });
    setSchedules(data||[]);
  };
  useEffect(()=>{ load(); }, [currentMonth]);

  // FIX: generate tanggal pakai formatLocal, bukan toISOString
  const generateRecurringDates = (startStr: string, count: number, skipWeekend: boolean) => {
    const dates: string[] = [];
    let curr = new Date(startStr + "T00:00:00");
    let added = 0;
    while(added < count){
      const day = curr.getDay();
      if(skipWeekend && (day === 0 || day === 6)){ curr.setDate(curr.getDate() + 1); continue; }
      dates.push(formatLocal(curr));
      curr.setDate(curr.getDate() + 1); added++;
    }
    return dates;
  };

  // FIX: cek bentrok pakai jam, bukan cuma tanggal
  const checkConflict = async (dates: string[], formTimes:{start_time:string,end_time:string}, excludeId?:string)=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return { hasConflict: false, conflicts: [] };
    let query = supabase.from("schedules").select("*").eq("consultant_id", user.id).in("date", dates).neq("status", "REJECTED");
    if(excludeId) query = query.neq("id", excludeId);
    const { data } = await query;
    if(!data) return { hasConflict: false, conflicts: [] };
    const conflicts = data.filter((ex:any)=> {
      const sE = timeToMin(ex.start_time), eE = timeToMin(ex.end_time);
      const sN = timeToMin(formTimes.start_time), eN = timeToMin(formTimes.end_time);
      return sE < eN && sN < eE;
    });
    return { hasConflict: conflicts.length>0, conflicts };
  };

  const handleSave = async (force=false)=>{
    if(!selectedDate) return;
    if(isSaving) return;
    setIsSaving(true);
    try{
      const { data:{ user } } = await supabase.auth.getUser();
      if(!user) return;
      const datesToSave = editing? [selectedDate] : generateRecurringDates(selectedDate, repeatCount, skipWeekend);
      if(!force){
        const c = await checkConflict(datesToSave, { start_time: form.start_time, end_time: form.end_time }, editing?.id);
        if(c.hasConflict){ setConflictWarning({ conflicts: c.conflicts, dates: datesToSave }); setIsSaving(false); return; }
      }
      if(editing){
        const payload = { consultant_id:user.id, date:selectedDate,...form, status: editing?.status==="REJECTED"? "PENDING" : (editing?.status || "PENDING") };
        await supabase.from("schedules").update(payload).eq("id", editing.id);
      }else{
        const payloads = datesToSave.map(d => ({ consultant_id: user.id, date: d,...form, status: "PENDING" as const }));
        const { error } = await supabase.from("schedules").insert(payloads);
        if(error) throw error;
      }
      setShowForm(false); setEditing(null); setConflictWarning(null); setRepeatCount(1);
      await load();
    } catch(e:any){ alert("Gagal simpan: " + e.message); } finally { setIsSaving(false); }
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = [...Array(firstDay).fill(null) as (number|null)[],...Array.from({length: daysInMonth}, (_, i) => i+1) as (number|null)[]];
  const getForDate = (d:number)=> {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return schedules.filter(s=>s.date===dateStr);
  };
  const todayStr = formatLocal(new Date());
  const pendingCount = schedules.filter(s=>s.status==="PENDING").length;
  const approvedCount = schedules.filter(s=>s.status==="APPROVED").length;

  return (
    <div className="min-h-screen bg-[#fcfbf8] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 bg-white p-5 rounded- border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center font-bold">S</div>
            <div><h1 className="text-xl font-bold">Dashboard Konsultan</h1><p className="text-xs text-zinc-500">Jadwal Konsultan SPRINT</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 bg-zinc-50 border rounded-xl text-xs max-w- truncate">{userEmail}</span>
            <button onClick={async()=>{ await supabase.auth.signOut(); location.href="/login"; }} className="px-4 py-2.5 bg-white border rounded-xl text-sm hover:bg-zinc-50">→ Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded- border shadow-sm flex items-center gap-4"><div className="w-14 h-14 bg-[#6366f1] rounded-2xl flex items-center justify-center text-white text-2xl">📅</div><div><div className="text-xs text-zinc-500">Jadwal Bulan Ini</div><div className="text-3xl font-bold">{schedules.length}</div></div></div>
          <div className="bg-white p-6 rounded- border shadow-sm flex items-center gap-4"><div className="w-14 h-14 bg-[#fef3c7] rounded-2xl flex items-center justify-center text-xl">⏳</div><div><div className="text-xs text-zinc-500">Menunggu</div><div className="text-3xl font-bold">{pendingCount}</div></div></div>
          <div className="bg-white p-6 rounded- border shadow-sm flex items-center gap-4"><div className="w-14 h-14 bg-[#dcfce7] rounded-2xl flex items-center justify-center text-xl">✅</div><div><div className="text-xs text-zinc-500">Disetujui</div><div className="text-3xl font-bold">{approvedCount}</div></div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
          <div className="bg-white rounded- border shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1,1))} className="w-9 h-9 bg-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-200">←</button>
              <h2 className="text-xl font-bold">{currentMonth.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h2>
              <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1,1))} className="w-9 h-9 bg-zinc-100 rounded-full flex items-center justify-center hover:bg-zinc-200">→</button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-zinc-100 rounded-2xl overflow-hidden border">
              {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=><div key={d} className="bg-zinc-50 text-center text- font-semibold text-zinc-500 py-3">{d}</div>)}
              {days.map((d,idx)=>{
                if(d===null) return <div key={idx} className="bg-white min-h-"/>;
                const list = getForDate(d);
                const isConflict = hasOverlapInList(list.filter(s=>s.status!=="REJECTED"));
                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const isToday = dateStr===todayStr;
                return (
                  <div key={idx} onClick={()=>{ setSelectedDate(dateStr); setForm({ client_name:"", project_name:"", location:"WFO" as any, task_description:"", start_time:"09:00", end_time:"17:00"}); setEditing(null); setRepeatCount(1); setShowForm(true); }}
                    className={`bg-white min-h- p-2 cursor-pointer hover:bg-zinc-50 transition relative ${isToday?"ring-2 ring-zinc-900 ring-inset":""} ${isConflict?"bg-red-50":""}`}>
                    <div className="flex justify-between items-start"><span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday?"bg-zinc-900 text-white":""}`}>{d}</span>{isConflict && <span className="text- bg-red-500 text-white px-1.5 rounded-full">Bentrok</span>}</div>
                    <div className="mt-2 space-y-1">
                      {list.slice(0,2).map(s=><div key={s.id} className={`text- px-1.5 py-0.5 rounded-full truncate font-medium ${s.status==="PENDING"?"bg-yellow-100 text-yellow-800":s.status==="APPROVED"?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>{s.client_name} {s.start_time}</div>)}
                      {list.length>2 && <div className="text- text-zinc-400">+{list.length-2} lagi</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-xs"><span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-400 rounded-full"/>Meeting</span><span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-full"/>Approved</span><span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-full"/>Bentrok jam</span></div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Jadwal Mendatang</h3>
            <div className="space-y-3 max-h- overflow-auto pr-1">
              {schedules.slice(0,10).map(s=>(
                <div key={s.id} className="bg-white p-4 rounded- border shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start"><div><div className="font-bold text-sm">{s.client_name}</div><div className="text-xs text-zinc-500">Project: {s.project_name}</div></div><span className={`text- px-2.5 py-1 rounded-full font-medium ${s.status==="PENDING"?"bg-yellow-100 text-yellow-800":s.status==="APPROVED"?"bg-emerald-100 text-emerald-800":"bg-red-100 text-red-800"}`}>{s.status}</span></div>
                  <div className="mt-3 space-y-1.5 text-xs"><div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-xl"><span>📅</span> {formatTanggalHari(s.date)}</div><div className="flex items-center gap-2"><span>🕘</span> {s.start_time}-{s.end_time} <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-">{s.location}</span></div>{s.task_description && <div className="text-zinc-500 text- line-clamp-2">{s.task_description}</div>}{s.rejection_reason && <div className="text-red-600 bg-red-50 p-2 rounded-xl text-">Alasan ditolak: {s.rejection_reason}</div>}</div>
                  {(s.status==="PENDING"||s.status==="REJECTED") && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={()=>{ setEditing(s); setSelectedDate(s.date); setForm({ client_name:s.client_name, project_name:s.project_name, location:s.location as any, task_description:s.task_description, start_time:s.start_time, end_time:s.end_time}); setShowForm(true); }} className="flex-1 border rounded-xl py-2 text-xs font-medium hover:bg-zinc-50">✏ Edit</button>
                      <button onClick={async()=>{ if(confirm("Hapus jadwal ini?")){ await supabase.from("schedules").delete().eq("id", s.id); load(); } }} className="flex-1 bg-red-50 text-red-600 border border-red-200 rounded-xl py-2 text-xs font-medium hover:bg-red-100">🗑 Hapus</button>
                    </div>
                  )}
                </div>
              ))}
              {schedules.length===0 && <div className="bg-white p-10 rounded- border text-center text-zinc-400 text-sm">Belum ada jadwal bulan ini.</div>}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded- w-full max-w-lg p-6 max-h- overflow-auto shadow-2xl">
            <h3 className="font-bold text-lg">{editing?"Edit":"Tambah"} Jadwal</h3>
            <div className="mt-5 space-y-3">
              {/* FIX: bisa edit tanggal sekarang */}
              <div>
                <label className="text-xs text-zinc-500">Tanggal</label>
                <input type="date" value={selectedDate||""} onChange={e=>setSelectedDate(e.target.value)} className="w-full border rounded-2xl px-4 py-3 text-sm mt-1"/>
                <p className="text- text-zinc-400 mt-1">{selectedDate? formatTanggalHari(selectedDate) : ""}</p>
              </div>
              <input value={form.client_name} onChange={e=>setForm({...form, client_name:e.target.value})} placeholder="Nama Client" className="w-full border rounded-2xl px-4 py-3 text-sm"/>
              <input value={form.project_name} onChange={e=>setForm({...form, project_name:e.target.value})} placeholder="Nama Project" className="w-full border rounded-2xl px-4 py-3 text-sm"/>
              <select value={form.location} onChange={e=>setForm({...form, location:e.target.value as any})} className="w-full border rounded-2xl px-4 py-3 text-sm"><option>WFO</option><option>WFH</option><option>On-site</option><option>Leave</option></select>
              <textarea value={form.task_description} onChange={e=>setForm({...form, task_description:e.target.value})} placeholder="Deskripsi tugas" className="w-full border rounded-2xl px-4 py-3 text-sm min-h-"/>
              <div className="flex gap-3"><input type="time" value={form.start_time} onChange={e=>setForm({...form, start_time:e.target.value})} className="flex-1 border rounded-2xl px-4 py-3 text-sm"/><input type="time" value={form.end_time} onChange={e=>setForm({...form, end_time:e.target.value})} className="flex-1 border rounded-2xl px-4 py-3 text-sm"/></div>
              {!editing && (
                <div className="bg-zinc-50 border rounded-2xl p-4 space-y-3">
                  <div className="font-semibold text-sm">Opsi Berulang (Recurring)</div>
                  <div className="flex items-center gap-3"><label className="text-sm">Berapa hari?</label><input type="number" min={1} max={30} value={repeatCount} onChange={e=>setRepeatCount(Math.max(1, parseInt(e.target.value)||1))} className="w-20 border rounded-xl px-3 py-2 text-sm"/><span className="text-xs text-zinc-500">hari berurutan</span></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skipWeekend} onChange={e=>setSkipWeekend(e.target.checked)} /> Lewati Sabtu-Minggu</label>
                  {repeatCount > 1 && selectedDate && <div className="text-xs text-zinc-600 bg-white p-2.5 rounded-xl border">Akan dibuat: <b>{generateRecurringDates(selectedDate, repeatCount, skipWeekend).map(d=>formatPendek(d)).join(", ")}</b></div>}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6"><button disabled={isSaving} onClick={()=>setShowForm(false)} className="flex-1 border py-3 rounded-2xl text-sm">Batal</button><button disabled={isSaving} onClick={()=>handleSave()} className="flex-1 bg-zinc-900 text-white py-3 rounded-2xl text-sm font-medium">{isSaving? "Menyimpan..." : (editing? "Update" : (repeatCount>1? `Simpan ${repeatCount} Hari` : "Simpan"))}</button></div>
          </div>
        </div>
      )}

      {conflictWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded- w-full max-w-md p-6 border-2 border-red-200 shadow-2xl">
            <h3 className="font-bold text-red-600">⚠ Bentrok Jam!</h3>
            <p className="text-sm mt-2 text-zinc-600">Sudah ada jadwal yang jamnya tabrakan:</p>
            <div className="mt-3 space-y-2 max-h-40 overflow-auto">{conflictWarning.conflicts.map((c:any)=><div key={c.id} className="p-2.5 bg-red-50 rounded-xl text-xs border border-red-100">{formatTanggalHari(c.date)} - {c.client_name} jam {c.start_time}-{c.end_time}</div>)}</div>
            <div className="flex gap-3 mt-5"><button disabled={isSaving} onClick={()=>setConflictWarning(null)} className="flex-1 border py-3 rounded-2xl text-sm">Batal</button><button disabled={isSaving} onClick={()=>{ setConflictWarning(null); handleSave(true); }} className="flex-1 bg-red-600 text-white py-3 rounded-2xl text-sm">Tetap Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}