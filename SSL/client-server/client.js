const https = require('https')
const fs = require('fs')

const clientCertKey = fs.readFileSync('../localhost-with-ca/localhost_client.key');
const clientCert = fs.readFileSync('../localhost-with-ca/localhost_client.crt');
const serverCA = fs.readFileSync('../localhost-with-ca/localhost-ca.crt');

const options = {
  hostname: 'localhost',
  rejectUnauthorized: true,
  port: 8000,
  path: '/',
  method: 'GET',
  key: clientCertKey,
  cert: clientCert,
  ca: serverCA
}

//////////// base request

const req = https.request(options, res => {
  const cert = res.req.socket.getPeerCertificate(true)
  console.log(cert.raw.toString('base64'));
  console.log(cert);
  console.log(JSON.stringify(cert.issuer))
  console.log(JSON.stringify(cert.subject))

  console.log(`statusCode: ${res.statusCode}`)

  res.on('data', d => {
    process.stdout.write(d)
  })
})

req.on('error', error => {
  console.error(error)
})

req.end()
