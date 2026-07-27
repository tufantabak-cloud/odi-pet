type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

interface GlobalNotificationGateInput {
  pathname: string
  permission: PushPermission
  isSubscribed: boolean
  isInitializing: boolean
}

export function shouldShowGlobalNotificationGate({
  pathname,
  permission,
  isSubscribed,
  isInitializing,
}: GlobalNotificationGateInput): boolean {
  if (!pathname.startsWith('/owner')) return false
  if (pathname.startsWith('/owner/pets/add')) return false
  if (isInitializing) return false
  if (permission === 'default' || permission === 'unsupported') return false

  return permission !== 'granted' || !isSubscribed
}