import { UserManager } from './auth/userManager.js';

// ⚠️ CHANGE THIS to YOUR username!
const username = 'Moonlittt';

console.log(`\n🔑 Making ${username} an admin...\n`);

const result = UserManager.makeAdminByUsername(username);

if (result.success) {
  console.log(`✅ SUCCESS! ${username} is now an ADMIN! 👑`);
  console.log(`\nYou now have full control:`);
  console.log(`  ✅ Change tickers for everyone`);
  console.log(`  ✅ Control expirations`);
  console.log(`  ✅ Admin badge displayed`);
  console.log(`\nOther users will see:`);
  console.log(`  🔒 Locked ticker controls`);
  console.log(`  👁️  View-only mode`);
  console.log(`\n🚀 Restart your server and log in to see the changes!\n`);
} else {
  console.error(`\n❌ ERROR: ${result.error}`);
  console.log(`\n💡 Tips:`);
  console.log(`  • Make sure the username matches EXACTLY (case-sensitive)`);
  console.log(`  • The user must be registered first`);
  console.log(`  • Check your database with: bun run check-users.js\n`);
}