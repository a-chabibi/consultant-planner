
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
  const [conflictWarning,setConflictWarning]=useState<any>(null);
  const [form,setForm]=useState({ client_name:"", project_name:"", location:"WFO" as any, task_description:"", start_time:"09:00", end_time:"17:00" });
  const [userEmail,setUserEmail]=useState("");

  const load = async ()=>{
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    setUserEmail(user.email||"");
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().slice(0,10);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0).toISOString().slice(0,10);
    const { data } = await supabase.from("schedules").select("*").gte("date", start).lte("date", end).order("date", { ascending:true });
    setSchedules(data||[]);
  };
  useEffect(()=>{ load(); }, [currentMonth]);

  const checkConflict = async (date:string, excludeId?:string)=>{
    const res = await fetch("/api/schedules/conflict-check", { method:"POST", body: JSON.stringify({ date, excludeId }) });
    const json = await res.json();
    return json;
  };

  const handleSave = async (force=false)=>{
    if(!selectedDate) return;
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return;
    if(!force){
      const c = await checkConflict(selectedDate, editing?.id);
      if(c.hasConflict){
        setConflictWarning(c); return;
      }
    }
    const payload = { consultant_id:user.id, date:selectedDate, ...form, status: editing?.status==="REJECTED" ? "PENDING" : (editing?.status || "PENDING") };
    if(editing){
      await supabase.from("schedules").update(payload).eq("id", editing.id);
    }else{
      await supabase.from("schedules").insert(payload);
    }
    setShowForm(false); setEditing(null); setConflictWarning(null); load();
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({length:firstDay}).map(()=>null).concat(Array.from({length:daysInMonth}).map((_,i)=>i+1));

  const getForDate = (d:number)=>{
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return schedules.filter(s=>s.date===dateStr);
  };

  return (
    <div className="min-h-screen bg-[#fcfbf8] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-2xl font-bold">Dashboard Konsultan</h1><p className="text-sm text-zinc-500">{userEmail}</p></div>
          <button onClick={async()=>{ await supabase.auth.signOut(); location.href="/login"; }} className="px-4 py-2 bg-white border rounded-xl">Logout</button>
        </div>

        <div className="bg-white rounded-[24px] border shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1,1))} className="px-3 py-2 border rounded-xl">← Prev</button>
            <h2 className="font-semibold">{currentMonth.toLocaleDateString("id-ID",{month:"long",year:"numeric"})}</h2>
            <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1,1))} className="px-3 py-2 border rounded-xl">Next →</button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=><div key={d} className="text-center text-zinc-400 py-2">{d}</div>)}
            {days.map((d,idx)=>{
              if(d===null) return <div key={idx}/>;
              const list = getForDate(d);
              const isConflict = list.filter(s=>s.status!=="REJECTED").length>1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              return (
                <div key={idx} onClick={()=>{ setSelectedDate(dateStr); setForm({ client_name:"", project_name:"", location:"WFO" as any, task_description:"", start_time:"09:00", end_time:"17:00"}); setEditing(null); setShowForm(true); }}
                  className={`min-h-[90px] p-2 rounded-2xl border cursor-pointer hover:bg-zinc-50 ${isConflict?"bg-red-50 border-red-300":"bg-white"}`}>
                  <div className="flex justify-between"><span className="font-medium">{d}</span>{isConflict && <span>⚠️</span>}</div>
                  <div className="mt-1 space-y-1">
                    {list.slice(0,3).map(s=><div key={s.id} className={`text-[10px] px-1.5 py-0.5 rounded-full truncate ${s.status==="PENDING"?"bg-yellow-100 text-yellow-800":s.status==="APPROVED"?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{s.client_name}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-[24px] border p-6">
          <h3 className="font-semibold mb-4">Jadwal Saya Bulan Ini</h3>
          <div className="space-y-3">
            {schedules.map(s=>(
              <div key={s.id} className="flex justify-between items-center p-4 border rounded-2xl">
                <div>
                  <div className="font-medium">{s.client_name} - {s.project_name} <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full ${s.status==="PENDING"?"bg-yellow-100 text-yellow-800":s.status==="APPROVED"?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{s.status}</span></div>
                  <div className="text-xs text-zinc-500">{s.date} {s.start_time}-{s.end_time} • {s.location} • {s.task_description}</div>
                  {s.rejection_reason && <div className="text-xs text-red-600 mt-1">Alasan ditolak: {s.rejection_reason}</div>}
                </div>
                {(s.status==="PENDING"||s.status==="REJECTED") && (
                  <div className="flex gap-2">
                    <button onClick={()=>{ setEditing(s); setSelectedDate(s.date); setForm({ client_name:s.client_name, project_name:s.project_name, location:s.location as any, task_description:s.task_description, start_time:s.start_time, end_time:s.end_time}); setShowForm(true); }} className="px-3 py-1.5 border rounded-xl text-xs">Edit</button>
                    <button onClick={async()=>{ await supabase.from("schedules").delete().eq("id", s.id); load(); }} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs">Hapus</button>
                  </div>
                )}
              </div>
            ))}
            {schedules.length===0 && <p className="text-sm text-zinc-400">Belum ada jadwal bulan ini</p>}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] w-full max-w-lg p-6">
            <h3 className="font-bold text-lg">{editing?"Edit":"Tambah"} Jadwal - {selectedDate}</h3>
            <div className="mt-4 space-y-3">
              <input value={form.client_name} onChange={e=>setForm({...form, client_name:e.target.value})} placeholder="Nama Client" className="w-full border rounded-xl px-4 py-3"/>
              <input value={form.project_name} onChange={e=>setForm({...form, project_name:e.target.value})} placeholder="Nama Project" className="w-full border rounded-xl px-4 py-3"/>
              <select value={form.location} onChange={e=>setForm({...form, location:e.target.value as any})} className="w-full border rounded-xl px-4 py-3"><option>WFO</option><option>WFH</option><option>On-site</option><option>Leave</option></select>
              <textarea value={form.task_description} onChange={e=>setForm({...form, task_description:e.target.value})} placeholder="Deskripsi tugas" className="w-full border rounded-xl px-4 py-3"/>
              <div className="flex gap-3"><input type="time" value={form.start_time} onChange={e=>setForm({...form, start_time:e.target.value})} className="flex-1 border rounded-xl px-4 py-3"/><input type="time" value={form.end_time} onChange={e=>setForm({...form, end_time:e.target.value})} className="flex-1 border rounded-xl px-4 py-3"/></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={()=>setShowForm(false)} className="flex-1 border py-3 rounded-xl">Batal</button><button onClick={()=>handleSave()} className="flex-1 bg-zinc-900 text-white py-3 rounded-xl">Simpan</button></div>
          </div>
        </div>
      )}

      {conflictWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 border-2 border-red-200">
            <h3 className="font-bold text-red-600">⚠️ Bentrok Terdeteksi!</h3>
            <p className="text-sm mt-2">Kamu sudah ada jadwal di tanggal ini:</p>
            <div className="mt-3 space-y-2">{conflictWarning.conflicts.map((c:any)=><div key={c.id} className="p-2 bg-red-50 rounded-xl text-xs">{c.client_name} jam {c.start_time}-{c.end_time}</div>)}</div>
            <p className="text-sm mt-3 font-medium">Yakin mau double booking?</p>
            <div className="flex gap-3 mt-5"><button onClick={()=>setConflictWarning(null)} className="flex-1 border py-3 rounded-xl">Batal</button><button onClick={()=>{ setConflictWarning(null); handleSave(true); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl">Tetap Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
