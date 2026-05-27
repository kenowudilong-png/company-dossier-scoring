import { redirect } from "next/navigation";
export default function DossierHome({ params }: { params: { dossierId: string } }) { redirect(`/d/${params.dossierId}/report`); }
