const encoder = new TextEncoder()

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value))
  return new Uint8Array(digest)
}

export async function isAuthorizedServiceRequest(
  request: Request,
  serviceRoleKey: string,
): Promise<boolean> {
  if (!serviceRoleKey) return false

  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return false

  const candidate = authorization.slice("Bearer ".length)
  if (!candidate) return false

  const [candidateDigest, expectedDigest] = await Promise.all([
    sha256(candidate),
    sha256(serviceRoleKey),
  ])

  let difference = 0
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= candidateDigest[index] ^ expectedDigest[index]
  }

  return difference === 0
}
