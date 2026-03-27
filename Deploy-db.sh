#!/bin/bash

set -e

# 🔥 INPUTS
DB_NAME=${1:-omfsitdb}
BACKUP_FILE=${2:-backup_omf.sql}

echo "======================================="
echo "🚀 STARTING DB SETUP"
echo "DB NAME      : $DB_NAME"
echo "BACKUP FILE  : $BACKUP_FILE"
echo "======================================="

# Export for envsubst
export DB_NAME
export BACKUP_FILE

# Step 1: PV
kubectl apply -f db_data_pv.yaml

# Step 2: PVC
kubectl apply -f db_data_pvc.yaml

echo "⏳ Waiting for PVC..."
kubectl wait --for=condition=Bound pvc/pgdata-sit-pvc --timeout=60s || true

# Step 3: Service
kubectl apply -f db_service.yaml

# Step 4: Deployment (dynamic DB name)
envsubst < db_create_deployment.yaml | kubectl apply -f -

echo "⏳ Waiting for DB pod..."
kubectl wait --for=condition=ready pod -l app=df-db-sit-omf --timeout=120s

echo "✅ DB READY"

# Step 5: Restore Job (dynamic values)
envsubst < db_create_restore_job_latest.yaml | kubectl apply -f -

sleep 5

JOB_NAME=$(kubectl get jobs --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1].metadata.name}")

kubectl logs -f job/$JOB_NAME

echo "🎉 DONE"
