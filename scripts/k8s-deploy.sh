#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="${ROOT_DIR}/k8s"

if [ ! -f "${K8S_DIR}/02-secret.yaml" ]; then
    echo "ERROR: Production secret manifest k8s/02-secret.yaml is required; no cluster changes were made." >&2
    exit 1
fi

echo "==> [Kubernetes] Validating manifests..."
for manifest in 00-namespace.yaml 01-configmap.yaml database/migration-job.yaml \
    04-services.yaml 03-backend-deployment.yaml 03-frontend-deployment.yaml \
    05-hpa.yaml 06-pdb.yaml 07-ingress.yaml 08-networkpolicy.yaml; do
    kubectl apply --dry-run=client -f "${K8S_DIR}/${manifest}"
done
# Kubernetes validation errors can contain manifest values. Keep secrets out of logs.
if ! kubectl apply --dry-run=client -f "${K8S_DIR}/02-secret.yaml" >/dev/null 2>&1; then
    echo "ERROR: Production secret manifest validation failed; no cluster changes were made." >&2
    exit 1
fi

echo "==> [Kubernetes] Applying base infrastructure..."
kubectl apply -f "${K8S_DIR}/00-namespace.yaml"
kubectl apply -f "${K8S_DIR}/01-configmap.yaml"

echo "==> [Kubernetes] Applying production secrets..."
if ! kubectl apply -f "${K8S_DIR}/02-secret.yaml" >/dev/null 2>&1; then
    echo "ERROR: Applying production secrets failed; workloads were not deployed." >&2
    exit 1
fi

kubectl apply -f "${K8S_DIR}/08-networkpolicy.yaml"

echo "==> [Kubernetes] Running database migrations with advisory lock..."
# A completed Job must never satisfy the wait for a new release.
kubectl delete job/genyxo-db-migration -n genyxo --ignore-not-found --wait=true --timeout=120s
kubectl create -f "${K8S_DIR}/database/migration-job.yaml"
kubectl wait --for=condition=complete --timeout=120s job/genyxo-db-migration -n genyxo

echo "==> [Kubernetes] Deploying Services & Workloads..."
kubectl apply -f "${K8S_DIR}/04-services.yaml"
kubectl apply -f "${K8S_DIR}/03-backend-deployment.yaml"
kubectl apply -f "${K8S_DIR}/03-frontend-deployment.yaml"
kubectl apply -f "${K8S_DIR}/05-hpa.yaml"
kubectl apply -f "${K8S_DIR}/06-pdb.yaml"
kubectl apply -f "${K8S_DIR}/07-ingress.yaml"

echo "==> [Kubernetes] Waiting for deployment rollout..."
kubectl rollout status deployment/genyxo-backend -n genyxo --timeout=120s
kubectl rollout status deployment/genyxo-frontend -n genyxo --timeout=120s

echo "==> [Kubernetes] Current cluster status:"
kubectl get pods,svc,hpa,ingress -n genyxo
