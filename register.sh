#!/usr/bin/env bash
# Create keys, log in, and register the five flood-data SuperNodes.
set -e

mkdir -p keys
for i in 0 1 2 3 4; do
  [ -f "keys/supernode-$i" ] || ssh-keygen -t ecdsa -b 384 -N "" -C "supernode-$i" -f "keys/supernode-$i"
done

uvx flwr login supergrid
uvx flwr supernode register keys/supernode-0.pub supergrid --name="Nepal - Koshi Gauge Network"     --location="26.9,87.2"
uvx flwr supernode register keys/supernode-1.pub supergrid --name="India - Ganga Gauge Network"     --location="25.6,85.1"
uvx flwr supernode register keys/supernode-2.pub supergrid --name="China - Yarlung Tsangpo Network" --location="29.3,94.4"
uvx flwr supernode register keys/supernode-3.pub supergrid --name="Bhutan - Manas Gauge Network"    --location="26.9,90.4"
uvx flwr supernode register keys/supernode-4.pub supergrid --name="Myanmar - Barak/Meghna Network"  --location="22.9,94.1"
