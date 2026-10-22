import "server-only";

/**
 * Tiny SQL layer. Production uses Postgres via DATABASE_URL.
 * Local development falls back to PGlite (Postgres in WASM) stored in .data/, so no setup is needed.
 */
type Row = Record<string, unknown>;
type Query = <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]>;

let ready: Promise<Query> | null = null;

const SCHEMA = `
create table if not exists members (
  account_id   text primary key,
  address      text not null,
  chain        text not null,
  stake_key    text,
  army         text not null,
  invite_code  text not null unique,
  recruited_by text references members(account_id),
  is_recruit   boolean not null default false,
  joined_at    timestamptz not null default now()
);
create index if not exists members_army on members(army);
create index if not exists members_recruited_by on members(recruited_by);
`;

async function connect(): Promise<Query> {
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 3, prepare: false });
    await sql.unsafe(SCHEMA);
    return async (text, params = []) => (await sql.unsafe(text, params as never[])) as never;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  // On a serverless host without DATABASE_URL, run from /tmp and start from the committed season seed.
  // New enlistments in that mode last until the instance restarts; set DATABASE_URL for real persistence.
  const ephemeral = !!process.env.VERCEL;
  const dir = ephemeral ? "/tmp/raid-db" : ".data/raid";
  mkdirSync(ephemeral ? "/tmp" : ".data", { recursive: true });
  const db = new PGlite(dir);
  await db.exec(SCHEMA);
  if (ephemeral) {
    const seed = (await import("@/data/seed-members.json")).default as Member[];
    for (const m of seed)
      await db.query(
        `insert into members (account_id, address, chain, stake_key, army, invite_code, recruited_by, is_recruit, joined_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing`,
        [m.account_id, m.address, m.chain, m.stake_key, m.army, m.invite_code, m.recruited_by, m.is_recruit, m.joined_at],
      );
  }
  return async (text, params = []) => (await db.query(text, params)).rows as never;
}

export function db(): Promise<Query> {
  ready ??= connect();
  return ready;
}

export interface Member {
  account_id: string;
  address: string;
  chain: string;
  stake_key: string | null;
  army: string;
  invite_code: string;
  recruited_by: string | null;
  is_recruit: boolean;
  joined_at: string;
}

export async function listMembers(): Promise<Member[]> {
  const q = await db();
  return q<Member & Row>("select * from members order by joined_at");
}

export async function memberByInvite(code: string): Promise<Member | null> {
  const q = await db();
  const rows = await q<Member & Row>("select * from members where invite_code = $1", [code]);
  return rows[0] ?? null;
}

export async function upsertMember(m: Omit<Member, "joined_at">): Promise<Member> {
  const q = await db();
  const rows = await q<Member & Row>(
    `insert into members (account_id, address, chain, stake_key, army, invite_code, recruited_by, is_recruit)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (account_id) do update set army = excluded.army
     returning *`,
    [m.account_id, m.address, m.chain, m.stake_key, m.army, m.invite_code, m.recruited_by, m.is_recruit],
  );
  return rows[0];
}
