#!/usr/bin/env sh
# =============================================================================
# 将 Nest 容器使用的 Docker 卷中的 SQLite 备份到阿里云 OSS。
# 在已部署 API 的 ECS / 任意 Linux 主机上执行（需已安装 Docker，用户有 docker CLI 权限）。
#
# 必填环境变量：
#   ALIYUN_ACCESS_KEY_ID      — RAM 用户 AccessKey（建议仅 OSS 备份权限）
#   ALIYUN_ACCESS_KEY_SECRET
#   ALIYUN_OSS_BUCKET         — Bucket 名称（不含 oss:// 前缀）
#   ALIYUN_OSS_ENDPOINT       — 如 oss-cn-hangzhou.aliyuncs.com
#
# 可选：
#   DOCKER_VOLUME_NAME        — 与部署时一致，默认 zxdnoob-api-data
#   ALIYUN_OSS_PREFIX         — OSS 对象前缀，默认 blog-api/backups
#   OSSUTIL_BIN               — ossutil 可执行文件路径；未设置则下载到 /tmp/ossutil64
#
# 若 ECS 已绑定 OSS 写入权限的实例 RAM 角色，可在机器上配置 ossutil 使用 STS，
# 此时可不设 AK/SK（需自行改写本脚本或改用 ossutil 配置文件）。
# =============================================================================
set -eu

DOCKER_VOLUME_NAME="${DOCKER_VOLUME_NAME:-zxdnoob-api-data}"
ALIYUN_OSS_PREFIX="${ALIYUN_OSS_PREFIX:-blog-api/backups}"
TMP_SQLITE="${TMPDIR:-/tmp}/blog-backup-$$.sqlite"

: "${ALIYUN_ACCESS_KEY_ID:?}"
: "${ALIYUN_ACCESS_KEY_SECRET:?}"
: "${ALIYUN_OSS_BUCKET:?}"
: "${ALIYUN_OSS_ENDPOINT:?}"

OSSUTIL="${OSSUTIL_BIN:-}"
if [ -z "$OSSUTIL" ] || [ ! -x "$OSSUTIL" ]; then
  OSSUTIL="/tmp/ossutil64-$$"
  curl -fsSL -o "$OSSUTIL" "http://gosspublic.alicdn.com/ossutil/ossutil64" || {
    echo "ossutil download failed; install ossutil and set OSSUTIL_BIN" >&2
    exit 1
  }
  chmod +x "$OSSUTIL"
  trap 'rm -f "$OSSUTIL"' EXIT INT TERM
fi

docker run --rm \
  -v "${DOCKER_VOLUME_NAME}:/data:ro" \
  -v "$(dirname "$TMP_SQLITE"):/out" \
  alpine:3.20 \
  cp "/data/blog.sqlite" "/out/$(basename "$TMP_SQLITE")"

OBJECT_KEY="${ALIYUN_OSS_PREFIX}/blog-$(date +%Y%m%d-%H%M%S).sqlite"
OBJECT_KEY="$(echo "$OBJECT_KEY" | sed 's#//*#/#g; s#^/##')"

"$OSSUTIL" cp "$TMP_SQLITE" "oss://${ALIYUN_OSS_BUCKET}/${OBJECT_KEY}" \
  -i "$ALIYUN_ACCESS_KEY_ID" \
  -k "$ALIYUN_ACCESS_KEY_SECRET" \
  -e "$ALIYUN_OSS_ENDPOINT"

rm -f "$TMP_SQLITE"
echo "Uploaded oss://${ALIYUN_OSS_BUCKET}/${OBJECT_KEY}"
