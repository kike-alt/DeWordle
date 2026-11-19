#!/bin/sh
# Container healthcheck for Caddy: succeeds when the admin API answers on
# port 2019 (the image is alpine-based and has wget, not curl).
wget -q --spider http://localhost:2019/metrics || exit 1
