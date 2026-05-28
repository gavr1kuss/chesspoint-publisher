import Nav from "@/components/Nav";
import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <>
      <Nav active="admin" />
      <main className="flex-1">
        <AdminClient />
      </main>
    </>
  );
}
