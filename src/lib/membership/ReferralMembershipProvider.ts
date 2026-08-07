import { ManualMembershipProvider } from './ManualMembershipProvider';
import { MembershipProviderType } from './types';

export class ReferralMembershipProvider extends ManualMembershipProvider {
  override readonly providerType: MembershipProviderType = 'referral';
}
