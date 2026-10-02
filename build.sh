#!/usr/bin/env bash
# Root build script for Render deployment
set -o errexit

if [ -d "esas/backend" ]; then
    echo "Found esas/backend directory. Navigating..."
    cd esas/backend
fi

chmod +x ./build.sh
./build.sh
