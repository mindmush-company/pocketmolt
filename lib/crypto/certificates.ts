import forge from 'node-forge'

const CA_COMMON_NAME = 'PocketMolt Internal CA'
const CA_VALIDITY_YEARS = 10
const CERT_VALIDITY_DAYS = 365

interface CertificatePair {
  certificate: string
  privateKey: string
}

export function generateCACertificate(): CertificatePair {
  const keys = forge.pki.rsa.generateKeyPair(4096)
  const cert = forge.pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'

  const now = new Date()
  cert.validity.notBefore = now
  cert.validity.notAfter = new Date(
    now.getTime() + CA_VALIDITY_YEARS * 365 * 24 * 60 * 60 * 1000
  )

  const attrs = [
    { name: 'commonName', value: CA_COMMON_NAME },
    { name: 'organizationName', value: 'PocketMolt' },
  ]

  cert.setSubject(attrs)
  cert.setIssuer(attrs)

  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ])

  cert.sign(keys.privateKey, forge.md.sha256.create())

  return {
    certificate: forge.pki.certificateToPem(cert),
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
  }
}

export function generateBotCertificate(
  botId: string,
  caCert: string,
  caKey: string
): CertificatePair {
  const caCertObj = forge.pki.certificateFromPem(caCert)
  const caKeyObj = forge.pki.privateKeyFromPem(caKey)

  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16))

  const now = new Date()
  cert.validity.notBefore = now
  cert.validity.notAfter = new Date(
    now.getTime() + CERT_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  )

  cert.setSubject([
    { name: 'commonName', value: `bot-${botId}` },
    { name: 'organizationName', value: 'PocketMolt Bot' },
  ])

  cert.setIssuer(caCertObj.subject.attributes)

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', clientAuth: true },
    { name: 'subjectKeyIdentifier' },
    {
      name: 'authorityKeyIdentifier',
      keyIdentifier: true,
      authorityCertIssuer: true,
      serialNumber: true,
    },
  ])

  cert.sign(caKeyObj, forge.md.sha256.create())

  return {
    certificate: forge.pki.certificateToPem(cert),
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
  }
}

export function generateServerCertificate(
  hostname: string,
  privateIp: string,
  caCert: string,
  caKey: string
): CertificatePair {
  const caCertObj = forge.pki.certificateFromPem(caCert)
  const caKeyObj = forge.pki.privateKeyFromPem(caKey)

  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16))

  const now = new Date()
  cert.validity.notBefore = now
  cert.validity.notAfter = new Date(
    now.getTime() + CERT_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  )

  cert.setSubject([
    { name: 'commonName', value: hostname },
    { name: 'organizationName', value: 'PocketMolt' },
  ])

  cert.setIssuer(caCertObj.subject.attributes)

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectKeyIdentifier' },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: hostname },
        { type: 7, ip: privateIp },
      ],
    },
  ])

  cert.sign(caKeyObj, forge.md.sha256.create())

  return {
    certificate: forge.pki.certificateToPem(cert),
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
  }
}

export function extractBotIdFromCert(certPem: string): string | null {
  try {
    const cert = forge.pki.certificateFromPem(certPem)
    const cn = cert.subject.getField('CN')?.value
    if (cn && typeof cn === 'string' && cn.startsWith('bot-')) {
      return cn.slice(4)
    }
    return null
  } catch {
    return null
  }
}

export function verifyCertificate(certPem: string, caCertPem: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(certPem)
    const caCert = forge.pki.certificateFromPem(caCertPem)
    return caCert.verify(cert)
  } catch {
    return false
  }
}
