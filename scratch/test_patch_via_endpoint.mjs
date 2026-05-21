async function run() {
  const email = 'tufan.tabak@gmail.com'
  const password = 'att1472o'
  const petId = 'fd522953-c8ad-4221-bdf5-5f7ea8d49bed'

  console.log(`1. Logging in to http://localhost:3000 as ${email}...`)
  const loginFd = new FormData()
  loginFd.append('email', email)
  loginFd.append('password', password)

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: loginFd
  })

  console.log(`Login status: ${loginRes.status}`)
  const loginResult = await loginRes.json()
  console.log('Login response body:', loginResult)

  if (!loginRes.ok) {
    console.error('Login failed')
    return
  }

  // Get the cookies
  const cookies = loginRes.headers.getSetCookie()
  if (!cookies || cookies.length === 0) {
    console.error('No set-cookie header received')
    return
  }

  const cookieString = cookies.map(c => c.split(';')[0]).join('; ')
  console.log('Cookies extracted:', cookieString)

  // 2. Perform the PATCH request
  console.log(`2. Sending PATCH request to http://localhost:3000/api/pets/${petId}...`)
  const patchFd = new FormData()
  patchFd.append('name', 'İnci')
  patchFd.append('breed', 'Ankara Kedisi')
  patchFd.append('birth_date', '1997-04-30')
  patchFd.append('gender', 'female')
  patchFd.append('lifestyle', 'indoor')
  patchFd.append('size', 'medium')

  const patchRes = await fetch(`http://localhost:3000/api/pets/${petId}`, {
    method: 'PATCH',
    headers: {
      'Cookie': cookieString
    },
    body: patchFd
  })

  console.log(`PATCH status: ${patchRes.status}`)
  const patchText = await patchRes.text()
  console.log('PATCH response body:', patchText)
}

run()
