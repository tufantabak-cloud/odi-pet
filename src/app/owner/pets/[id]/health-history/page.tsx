import { redirect } from 'next/navigation';

export default async function HealthHistoryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  redirect(`/owner/pets/${id}`);
}
