import dotenv from 'dotenv';
dotenv.config();
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function updateProfiles() {
  console.log('Updating profile picture URLs...');
  const emps = await db.select().from(schema.employees);
  for (const emp of emps) {
    if (!emp.profilePictureUrl) {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, emp.userId)).limit(1);
      const url = `https://i.pravatar.cc/150?u=${user.email}`;
      await db.update(schema.employees)
        .set({ profilePictureUrl: url })
        .where(eq(schema.employees.id, emp.id));
    }
  }
  console.log('Avatars updated.');
  process.exit(0);
}
updateProfiles();
