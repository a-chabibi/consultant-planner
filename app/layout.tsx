import "./globals.css";
export const metadata = { title: "Consultant Schedule Planner" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#fcfbf8] text-zinc-900 antialiased">{children}</body>
    </html>
  );
}