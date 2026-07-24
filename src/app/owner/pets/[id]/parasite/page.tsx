import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetParasitePage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/owner/pets/${id}?tab=parasite`);
}
