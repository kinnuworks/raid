#!/bin/bash
# Waits for the next UTC day, then runs the recruits' second trading day and checks the result.
set -u
cd "$(dirname "$0")/.."
target=$(python3 -c 'import datetime as d;n=d.datetime.now(d.timezone.utc);t=(n+d.timedelta(days=1)).replace(hour=0,minute=3,second=0,microsecond=0) if n.hour>=1 else n.replace(hour=0,minute=3,second=0,microsecond=0);print(int((t-n).total_seconds()))')
echo "sleeping ${target}s until 00:03 UTC"; sleep "$target"
date -u
t(){ npx tsx scripts/demo.mts trade "$@" 2>&1 | tail -1; }
t rec-1 SOL-USD buy 20; t rec-2 ETH-USD buy 20; t rec-3 SOL-USD sell 20
t snek-1 SOL-USD sell 20; t snek-2 SOL-USD buy 20; t hosky-1 ETH-USD sell 20; t hosky-2 ETH-USD buy 20; t night-1 ETH-USD sell 20
sleep 20
curl -s "https://raid-armies.vercel.app/api/season?fresh=1" | python3 -c 'import sys,json;s=json.load(sys.stdin);[print(r["account_id"][-6:],r["check"]["status"],r["check"]["reasons"]) for r in s["recruits"]];print(s["recruitBoard"]);print([(t["symbol"],t["owner"]) for t in s["tiles"]])'
