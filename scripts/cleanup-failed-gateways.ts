import 'dotenv/config'
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  
  console.log('Checking for failed/pending NAT gateways...\n')
  
  const { data: gateways, error } = await supabase
    .from('nat_gateways')
    .select('*')
  
  if (error) {
    console.error('Error fetching gateways:', error)
    process.exit(1)
  }
  
  if (!gateways || gateways.length === 0) {
    console.log('No NAT gateways found.')
    return
  }
  
  console.log('Existing gateways:')
  for (const gw of gateways) {
    console.log(`  - ${gw.name}: status=${gw.status}, server_id=${gw.hetzner_server_id}`)
  }
  
  const toDelete = gateways.filter(
    (g: { status: string; hetzner_server_id: string }) => 
      g.status === 'failed' || g.status === 'provisioning' || g.hetzner_server_id === 'pending'
  )
  
  if (toDelete.length === 0) {
    console.log('\nNo failed/pending gateways to clean up.')
    return
  }
  
  console.log(`\nDeleting ${toDelete.length} failed/pending gateway(s)...`)
  
  for (const gw of toDelete) {
    const { error: deleteError } = await supabase
      .from('nat_gateways')
      .delete()
      .eq('id', gw.id)
    
    if (deleteError) {
      console.error(`  ❌ Failed to delete ${gw.name}:`, deleteError.message)
    } else {
      console.log(`  ✅ Deleted ${gw.name}`)
    }
  }
  
  console.log('\nCleanup complete.')
}

main().catch(console.error)
