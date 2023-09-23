#!/bin/sh
mpv --input-ipc-server=/tmp/mpv-w2g --force-window=yes --player-operation-mode=pseudo-gui &
node index.js
