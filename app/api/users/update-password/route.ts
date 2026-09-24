import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/users/update-password  { userId: string, password: string }
// Hanya boleh dipanggil oleh user dengan role GM.
// Menggunakan service role key (SERVER ONLY — tidak pernah diekspos ke client)
// untuk mengubah password user lain via Supabase Admin API.
export async function POST(req: Request) {
  try {
    // Client biasa (anon + token GM) untuk verifikasi role pemanggil
    const supabase = await createClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "GM") {
      return NextResponse.json({ error: "Akses ditolak: hanya GM yang bisa mengubah password" }, { status: 403 });
    }

    const { userId, password } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId tidak valid" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    // Jangan izinkan GM mengubah password akunnya sendiri lewat jalur admin
    // (untuk itu lebih aman pakai flow "ubah password" normal dari akun sendiri)
    if (userId === caller.id) {
      return NextResponse.json({ error: "Tidak bisa mengubah password sendiri di sini" }, { status: 400 });
    }

    // Service role client — HANYA berjalan di server, key-nya dari env var
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY belum diset di environment server" }, { status: 500 });
    }

    const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("Gagal update password:", res.status, msg);
      return NextResponse.json({ error: "Gagal mengubah password" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
