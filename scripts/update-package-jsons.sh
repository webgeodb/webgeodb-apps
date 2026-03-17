#!/bin/bash

# 更新所有应用的 package.json
APPS_DIR="/Users/zhangyuting/github/zhyt1985/webgeodb-apps/apps"

# 定义应用映射（原名称 -> 新名称）
declare -A APP_NAMES=(
  ["offline-map"]="@webgeodb/app-offline-map"
  ["location-tracking"]="@webgeodb/app-location-tracking"
  ["fitness-tracker"]="@webgeodb/app-fitness-tracker"
  ["geo-fencing"]="@webgeodb/app-geo-fencing"
  ["environmental"]="@webgeodb/app-environmental"
  ["social-location"]="@webgeodb/app-social-location"
)

for app_dir in "$APPS_DIR"/*; do
  if [ -d "$app_dir" ]; then
    app_name=$(basename "$app_dir")
    pkg_file="$app_dir/package.json"

    if [ -f "$pkg_file" ]; then
      echo "更新 $app_name 的 package.json..."

      # 使用 jq 更新 JSON（如果没有 jq，可以用 Python）
      if command -v jq &> /dev/null; then
        jq --arg new_name "${APP_NAMES[$app_name]}" \
           '.name = $new_name | .dependencies["@webgeodb/core"] = "latest"' \
           "$pkg_file" > "$pkg_file.tmp" && \
          mv "$pkg_file.tmp" "$pkg_file"
      else
        # 使用 Python 替代
        python3 << EOF
import json
import sys

pkg_file = "$pkg_file"
new_name = "${APP_NAMES[$app_name]}"

with open(pkg_file, 'r') as f:
    data = json.load(f)

data['name'] = new_name
if 'dependencies' in data and '@webgeodb/core' in data['dependencies']:
    data['dependencies']['@webgeodb/core'] = 'latest'

with open(pkg_file, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"✓ 已更新 {pkg_file}")
EOF
      fi
    fi
  fi
done

echo "✅ 所有应用 package.json 更新完成！"
