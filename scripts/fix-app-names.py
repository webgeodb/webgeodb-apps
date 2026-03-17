#!/usr/bin/env python3
import json
import os

# 定义应用映射
app_mappings = {
    'offline-map': '@webgeodb/app-offline-map',
    'location-tracking': '@webgeodb/app-location-tracking',
    'fitness-tracker': '@webgeodb/app-fitness-tracker',
    'geo-fencing': '@webgeodb/app-geo-fencing',
    'environmental': '@webgeodb/app-environmental',
    'social-location': '@webgeodb/app-social-location'
}

apps_dir = '/Users/zhangyuting/github/zhyt1985/webgeodb-apps/apps'

for app_dir_name, correct_name in app_mappings.items():
    pkg_file = os.path.join(apps_dir, app_dir_name, 'package.json')

    if os.path.exists(pkg_file):
        with open(pkg_file, 'r') as f:
            data = json.load(f)

        # 更新名称
        data['name'] = correct_name

        # 确保 @webgeodb/core 是 latest
        if 'dependencies' in data and '@webgeodb/core' in data['dependencies']:
            data['dependencies']['@webgeodb/core'] = 'latest'

        # 写回文件
        with open(pkg_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')

        print(f"✓ 已修复 {app_dir_name}: {correct_name}")
    else:
        print(f"✗ 文件不存在: {pkg_file}")

print("\n✅ 所有应用名称已修复！")
