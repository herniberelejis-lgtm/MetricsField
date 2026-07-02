import { getClientes } from "@/lib/db";
import AnalyticsView from "@/components/AnalyticsView";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  return <AnalyticsView clientes={await getClientes()} />;
}
