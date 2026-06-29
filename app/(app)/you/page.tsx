import { getSession } from '@/lib/auth/session';
import { getProfileData } from '@/lib/db/profile';
import { getWallet } from '@/lib/rewards/queries';
import ProfileView from '@/components/ProfileView';
import RewardsWallet from '@/components/RewardsWallet';
export default async function YouPage() {
  const s = await getSession();
  const [data, wallet] = await Promise.all([
    getProfileData(s.handle!, s.userId!),
    getWallet(s.userId!, new Date().toISOString()),
  ]);
  return (
    <>
      <ProfileView data={data!} />
      <RewardsWallet wallet={wallet} />
    </>
  );
}
