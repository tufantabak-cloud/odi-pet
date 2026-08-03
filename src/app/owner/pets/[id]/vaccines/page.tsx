import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PetVaccinesPage(props: PageProps) {
  const { id } = await props.params;
  redirect(`/owner/pets/${id}`);
}
