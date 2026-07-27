import { createFileRoute } from "@tanstack/react-router";
import { MergedOrderDetailPage } from "@/pages/orders/merged/MergedOrderDetailPage";

function MergedOrderDetailRouteComponent() {
  const { id } = Route.useParams();
  return <MergedOrderDetailPage mergedOrderId={Number(id)} />;
}

export const Route = createFileRoute("/orders/merged/$id")({
  component: MergedOrderDetailRouteComponent,
});
