import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from './encryption'
import { generateBotCertificate } from './certificates'

interface ActiveCA {
  caCert: string
  caKey: string
  serverCert: string
  serverKey: string
}

let cachedCA: ActiveCA | null = null

export async function getActiveCA(): Promise<ActiveCA> {
  if (cachedCA) {
    return cachedCA
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { data, error } = await supabase
    .from('pocketmolt_ca')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('No active CA found. Run scripts/init-ca.ts first.')
  }

  cachedCA = {
    caCert: data.ca_cert,
    caKey: decrypt(data.ca_key_encrypted),
    serverCert: data.server_cert,
    serverKey: decrypt(data.server_key_encrypted),
  }

  return cachedCA
}

export async function generateBotCertificateFromCA(botId: string): Promise<{
  certificate: string
  privateKey: string
  caCertificate: string
}> {
  const ca = await getActiveCA()
  const botCert = generateBotCertificate(botId, ca.caCert, ca.caKey)

  return {
    certificate: botCert.certificate,
    privateKey: botCert.privateKey,
    caCertificate: ca.caCert,
  }
}

export function clearCACache(): void {
  cachedCA = null
}
