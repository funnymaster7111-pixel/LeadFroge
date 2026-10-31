#!/usr/bin/env bash
# Downloads the clinic assets with known URLs. Needs these hosts allowed in the
# session's network settings: www.shaperzwellness.com, novaweightandwellness.com.
# Provider headshots, office photos and stock photos are picked by hand (see each photos.md).
set -euo pipefail
cd "$(dirname "$0")/.."
curl -fsSL -o shaperz/photos/logo.png https://www.shaperzwellness.com/assets/shaperz-logo-B-KplKRz.png
curl -fsSL -o novaleo/photos/logo.png https://novaweightandwellness.com/assets/novaleo-logo-D8KPnvBJ.png
echo "logos saved"
