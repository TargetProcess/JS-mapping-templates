# Define where to store the generated certs and metadata.
DIR="$(pwd)/localhost-with-ca"

# Optional: Ensure the target directory exists and is empty.
rm -rf "${DIR}"
mkdir -p "${DIR}"

# Create the openssl configuration file. This is used for both generating
# the certificate as well as for specifying the extensions. It aims in favor
# of automation, so the DN is encoding and not prompted.
cat > "${DIR}/localhost.cnf" << EOF
[req]
default_bits = 2048
encrypt_key  = no # Change to encrypt the private key using des3 or similar
default_md   = sha256
prompt       = no
utf8         = yes

# Speify the DN here so we aren't prompted (along with prompt = no above).
distinguished_name = req_distinguished_name

# Extensions for SAN IP and SAN DNS
req_extensions = v3_req

# Be sure to update the subject to match your organization.
[req_distinguished_name]
C  = US
ST = New York
L  = Buffalo
O  = Targetprocess, Inc.
CN = localhost

# Allow client and server auth. You may want to only allow server auth.
# Link to SAN names.
[v3_req]
basicConstraints     = CA:FALSE
subjectKeyIdentifier = hash
keyUsage             = digitalSignature, keyEncipherment
extendedKeyUsage     = clientAuth, serverAuth
subjectAltName       = @alt_names

# Alternative names are specified as IP.# and DNS.# for IP addresses and
# DNS accordingly. 
[alt_names]
DNS.1 = localhost
EOF

cat > "${DIR}/openssl.cnf" << EOF
[req]
default_bits = 2048
encrypt_key  = no # Change to encrypt the private key using des3 or similar
default_md   = sha256
prompt       = no
utf8         = yes

# Speify the DN here so we aren't prompted (along with prompt = no above).
distinguished_name = req_distinguished_name

# Extensions for SAN IP and SAN DNS
req_extensions = v3_req

# Be sure to update the subject to match your organization.
[req_distinguished_name]
C  = US
ST = New York
L  = Buffalo
O  = Targetprocess, Inc.
CN = domainname.tpondemand.com

# Allow client and server auth. You may want to only allow server auth.
# Link to SAN names.
[v3_req]
basicConstraints     = CA:FALSE
subjectKeyIdentifier = hash
keyUsage             = digitalSignature, keyEncipherment
extendedKeyUsage     = clientAuth, serverAuth
subjectAltName       = @alt_names

# Alternative names are specified as IP.# and DNS.# for IP addresses and
# DNS accordingly. 
[alt_names]
DNS.1 = domain.tpondemand.com
EOF

# Create the certificate authority (CA). This will be a self-signed CA, and this
# command generates both the private key and the certificate. You may want to 
# adjust the number of bits (4096 is a bit more secure, but not supported in all
# places at the time of this publication). 
#
# To put a password on the key, remove the -nodes option.
#
# Be sure to update the subject to match your organization.
openssl req \
  -new \
  -newkey rsa:2048 \
  -days 10000 \
  -nodes \
  -x509 \
  -subj "/C=US/ST=New York/L=Buffalo/O=Targetprocess, Inc./CN=*.tpondemand.com" \
  -keyout "${DIR}/localhost-ca.key" \
  -out "${DIR}/localhost-ca.crt"


# Generate the private key for the service. Again, you may want to increase
# the bits to 4096.
openssl genrsa -out "${DIR}/localhost.key" 2048

# Generate a CSR using the configuration and the key just generated. We will
# give this CSR to our CA to sign.
openssl req \
  -new -key "${DIR}/localhost.key" \
  -out "${DIR}/localhost.csr" \
  -config "${DIR}/localhost.cnf"
  
# Sign the CSR with our CA. This will generate a new certificate that is signed
# by our CA.
openssl x509 \
  -req \
  -days 10000 \
  -in "${DIR}/localhost.csr" \
  -CA "${DIR}/localhost-ca.crt" \
  -CAkey "${DIR}/localhost-ca.key" \
  -CAcreateserial \
  -extensions v3_req \
  -extfile "${DIR}/localhost.cnf" \
  -out "${DIR}/localhost.crt"

# # (Optional) Verify the certificate.
# openssl x509 -in "${DIR}/localhost.crt" -noout -text


# Generate the private key for the service. Again, you may want to increase
# the bits to 4096.
openssl genrsa -out "${DIR}/localhost_client.key" 2048

# Generate a CSR using the configuration and the key just generated. We will
# give this CSR to our CA to sign.
openssl req \
  -new -key "${DIR}/localhost_client.key" \
  -out "${DIR}/localhost_client.csr" \
  -config "${DIR}/localhost.cnf"
  
# Sign the CSR with our CA. This will generate a new certificate that is signed
# by our CA.
openssl x509 \
  -req \
  -days 10000 \
  -in "${DIR}/localhost_client.csr" \
  -CA "${DIR}/localhost-ca.crt" \
  -CAkey "${DIR}/localhost-ca.key" \
  -CAcreateserial \
  -extensions v3_req \
  -extfile "${DIR}/localhost.cnf" \
  -out "${DIR}/localhost_client.crt"

# (Optional) Verify the certificates.
openssl x509 -in "${DIR}/localhost.crt" -noout -text
openssl x509 -in "${DIR}/localhost_client.crt" -noout -text

