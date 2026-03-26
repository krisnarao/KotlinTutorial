#!/bin/bash

set -e

echo "======================================="
echo "🚀 STARTING DB SETUP"
echo "======================================="

# Step 1: PV
echo "📦 Creating Persistent Volume..."
kubectl apply -f db_data_pv.yaml

# Step 2: PVC
echo "📦 Creating Persistent Volume Claim..."
kubectl apply -f db_data_pvc.yaml

# Wait for PVC to bind
echo "⏳ Waiting for PVC to bind..."
kubectl wait --for=condition=Bound pvc/pgdata-sit-pvc --timeout=60s || true

# Step 3: Service
echo "🌐 Creating Service..."
kubectl apply -f db_service.yaml

# Step 4: Deployment
echo "🐘 Creating Postgres Deployment..."
kubectl apply -f db_create_deployment.yaml

# Wait for Pod ready
echo "⏳ Waiting for DB Pod to be ready..."
kubectl wait --for=condition=ready pod -l app=df-db-sit-omf --timeout=120s

echo "======================================="
echo "✅ DATABASE DEPLOYMENT COMPLETED"
echo "======================================="

# Optional Step 5: Restore Job
read -p "Do you want to run restore job now? (y/n): " choice

if [[ "$choice" == "y" ]]; then
  echo "🔄 Running Restore Job..."
  kubectl apply -f db_create_restore_job_latest.yaml

  echo "📜 Fetching logs..."
  sleep 5

  JOB_NAME=$(kubectl get jobs --sort-by=.metadata.creationTimestamp -o jsonpath="{.items[-1].metadata.name}")

  echo "🔍 Logs for $JOB_NAME"
  kubectl logs -f job/$JOB_NAME
else
  echo "⏭️ Skipping restore step"
fi

echo "======================================="
echo "🎉 ALL DONE"
echo "======================================="
