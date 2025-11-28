import process from 'node:process'

console.log('💳 FANZ Payments Smoke Test')
console.log('===========================')
console.log('Payments smoke: target processor =', process.env.PAYMENTS_PROCESSOR || 'unset')
console.log('Use sandbox endpoints for adult-friendly gateways only.')
console.log('')
console.log('✅ Adult-friendly processors supported:')
console.log('   - CCBill, Segpay, Epoch, Vendo, Verotel')
console.log('   - NetBilling, CommerceGate, RocketGate')
console.log('   - CentroBill, Payze, Kolektiva')
console.log('')
console.log('❌ NEVER use Stripe or PayPal (banned for adult content)')
console.log('')
console.log('🔧 Configure env/.env.local with:')
console.log('   PAYMENTS_PROCESSOR=CCBill  # or Segpay, Epoch, etc.')
console.log('   PAYOUTS_PROVIDER=Paxum     # or ePayService, Wise, Crypto')

process.exit(0)