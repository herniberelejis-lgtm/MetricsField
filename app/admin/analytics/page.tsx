import type { Metadata } from "next";
import { getClientes } from "@/lib/db";
import AnalyticsView from "@/components/AnalyticsView";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  return <AnalyticsView clientes={await getClientes()} />;
}
