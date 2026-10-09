#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="${ROOT_DIR}/k8s"

echo "==> [Kubernetes] Validating manifests..."
kubectl apply --dry-run=client -f "${K8S_DIR}/00-namespace.yaml"
kubectl apply --dry-run=client -f "${K8S_DIR}/01-configmap.yaml"

echo "==> [Kubernetes] Applying base infrastructure..."
kubectl apply -f "${K8S_DIR}/00-namespace.yaml"
kubectl apply -f "${K8S_DIR}/01-configmap.yaml"

if [ -f "${K8S_DIR}/02-secret.yaml" ]; then
    echo "==> [Kubernetes] Applying production secrets..."
    kubectl apply -f "${K8S_DIR}/02-secret.yaml"
else
    echo "==> [Kubernetes] Notice: ${K8S_DIR}/02-secret.yaml not found. Generating from example..."
    kubectl apply -f "${K8S_DIR}/02-secret.example.yaml"
fi

echo "==> [Kubernetes] Deploying Services & Workloads..."
kubectl apply -f "${K8S_DIR}/04-services.yaml"
kubectl apply -f "${K8S_DIR}/03-backend-deployment.yaml"
kubectl apply -f "${K8S_DIR}/03-frontend-deployment.yaml"
kubectl apply -f "${K8S_DIR}/05-hpa.yaml"
kubectl apply -f "${K8S_DIR}/06-pdb.yaml"
kubectl apply -f "${K8S_DIR}/07-ingress.yaml"
kubectl apply -f "${K8S_DIR}/08-networkpolicy.yaml"

echo "==> [Kubernetes] Waiting for deployment rollout..."
kubectl rollout status deployment/genyxo-backend -n genyxo --timeout=120s
kubectl rollout status deployment/genyxo-frontend -n genyxo --timeout=120s

echo "==> [Kubernetes] Current cluster status:"
kubectl get pods,svc,hpa,ingress -n genyxo
