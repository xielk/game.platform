#!/usr/bin/env bash
set -euo pipefail

target_host="${1:-root@124.222.10.149}"
target_dir="${2:-/root/platform}"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
release_dir="$root_dir/release/platform-package"

cd "$root_dir"
npm run build

mkdir -p \
  "$release_dir/apps/web/dist" \
  "$release_dir/runtime/dist" \
  "$release_dir/runtime/node_modules/@prisma" \
  "$release_dir/runtime/node_modules/.prisma" \
  "$release_dir/prisma" \
  "$release_dir/deploy"

rsync -az --delete "$root_dir/apps/web/dist/" "$release_dir/apps/web/dist/"
rsync -az --delete "$root_dir/apps/api/dist/" "$release_dir/runtime/dist/"
rsync -az --delete "$root_dir/prisma/" "$release_dir/prisma/"
rsync -az --delete "$root_dir/deploy/" "$release_dir/deploy/"
rsync -az --delete "$root_dir/node_modules/@prisma/client/" "$release_dir/runtime/node_modules/@prisma/client/"
rsync -az --delete "$root_dir/node_modules/.prisma/client/" "$release_dir/runtime/node_modules/.prisma/client/"

ssh_opts=(
  -o BatchMode=yes
  -o ConnectTimeout=10
)

ssh "${ssh_opts[@]}" "$target_host" "mkdir -p '$target_dir/apps/web/dist' '$target_dir/runtime/dist' '$target_dir/runtime/node_modules/@prisma' '$target_dir/runtime/node_modules/.prisma' '$target_dir/prisma' '$target_dir/deploy/sql'"

rsync -az --delete "$release_dir/apps/web/dist/" "$target_host:$target_dir/apps/web/dist/"
rsync -az --delete "$release_dir/runtime/dist/" "$target_host:$target_dir/runtime/dist/"
rsync -az --delete "$release_dir/prisma/" "$target_host:$target_dir/prisma/"
rsync -az --delete "$release_dir/deploy/" "$target_host:$target_dir/deploy/"
rsync -az --delete "$release_dir/runtime/node_modules/@prisma/client/" "$target_host:$target_dir/runtime/node_modules/@prisma/client/"
rsync -az --delete "$release_dir/runtime/node_modules/.prisma/client/" "$target_host:$target_dir/runtime/node_modules/.prisma/client/"

ssh "${ssh_opts[@]}" "$target_host" "bash -lc '
  set -euo pipefail
  cd \"$target_dir\"
  set -a
  . ./.env
  set +a
  for sql_file in deploy/sql/*.sql; do
    [ -f \"\$sql_file\" ] || continue
    MYSQL_PWD=\"\$DB_PASSWORD\" mysql -h\"\$DB_HOST\" -u\"\$DB_USERNAME\" \"\$DB_DATABASE\" < \"\$sql_file\"
  done
  cp \"$target_dir/deploy/platform.service\" /etc/systemd/system/platform.service
  systemctl daemon-reload
  systemctl restart platform
  systemctl is-active platform
'"
