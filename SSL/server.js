const https = require('https');
const fs = require('fs');

const clientCA = fs.readFileSync('../localhost-with-ca/localhost-ca.crt')
const serverCertKey = fs.readFileSync('../localhost-with-ca/localhost.key');
const serverCert = fs.readFileSync('../localhost-with-ca/localhost.crt');
const serverCA = fs.readFileSync('../localhost-with-ca/localhost-ca.crt');

const options = {
  requestCert: true,
  rejectUnauthorized: true,
  key: serverCertKey,
  cert: serverCert + '\n' + serverCA,
  ca: clientCA
};

https.createServer(options, function (req, res) {
  console.log('New request received');
  if (!req.client.authorized) {
    res.writeHead(401);
    return res.end('Invalid client certificate authentication.');
  }
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8000);
