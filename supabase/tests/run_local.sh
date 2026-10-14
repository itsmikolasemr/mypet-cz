D="psql -h /tmp/pgd -p 5499 -U postgres -v ON_ERROR_STOP=1 -q"
$D -c "drop database if exists t" -c "create database t" 2>/dev/null
$D -d t -f $(dirname $0)/supabase_stub.sql 2>&1 | grep -i error
for f in $(dirname $0)/../migrations/*.sql; do $D -d t -f $f 2>&1 | grep -i error && echo "  in $f"; done; echo migrated
