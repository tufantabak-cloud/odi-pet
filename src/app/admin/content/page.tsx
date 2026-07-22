import ContentAdminClient from './ContentAdminClient';

export const metadata = {
  title: 'İçerik Yönetimi | Odi.Pet Admin',
  description: 'Kişiselleştirilmiş içerik ve rehber yönetimi'
};

export default function ContentAdminPage() {
  return <ContentAdminClient />;
}