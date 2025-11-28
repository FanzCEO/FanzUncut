# FANZ Ecosystem - Quick Start Guide

Deploy your entire FANZ multi-platform ecosystem in under 30 minutes.

## 🚀 One-Command Deployment

### Prerequisites

- Digital Ocean account
- GitHub account with repo access
- 5 registered domains (boyfanz.com, girlfanz.com, pupfanz.com, transfanz.com, taboofanz.com)

---

## Step 1: Digital Ocean Setup (10 min)

```bash
# Install doctl
wget https://github.com/digitalocean/doctl/releases/download/v1.100.0/doctl-1.100.0-linux-amd64.tar.gz
tar xf doctl-1.100.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init

# Create everything (cluster, database, registry)
doctl kubernetes cluster create fanz-production \
  --region nyc3 --size s-2vcpu-4gb --count 3 && \
doctl registry create fanz && \
doctl databases create fanz-db --engine pg --version 16 --region nyc3 --size db-s-2vcpu-4gb && \
doctl databases create fanz-redis --engine redis --version 7 --region nyc3 --size db-s-1vcpu-1gb

# Get credentials
doctl kubernetes cluster kubeconfig save fanz-production
doctl registry login
```

---

## Step 2: Configure Secrets (5 min)

```bash
# Clone repository
git clone https://github.com/FanzCEO/BoyFanzV1.git
cd BoyFanzV1

# Create secrets file
cp .env.production.template .env.production

# Edit with your values
nano .env.production
```

**Minimum required:**
```env
SESSION_SECRET=generate-random-64-char-string
JWT_SECRET=generate-random-64-char-string
DATABASE_URL=postgresql://user:pass@your-db-host:25060/fanz_production?sslmode=require
REDIS_URL=redis://default:password@your-redis-host:6379
```

```bash
# Create Kubernetes secrets
kubectl create namespace fanz-ecosystem
kubectl create secret generic fanz-secrets --from-env-file=.env.production -n fanz-ecosystem
```

---

## Step 3: Deploy to Kubernetes (5 min)

```bash
# Deploy everything
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/hpa/

# Install NGINX Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# Install SSL cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Configure Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@boyfanz.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Apply ingress
kubectl apply -f k8s/ingress/ingress.yaml
```

---

## Step 4: Configure DNS (5 min)

```bash
# Get load balancer IP
kubectl get service ingress-nginx-controller -n ingress-nginx
```

For **each domain**, add DNS A records:

| Domain | Type | Name | Value |
|--------|------|------|-------|
| boyfanz.com | A | @ | `<LOAD_BALANCER_IP>` |
| boyfanz.com | A | www | `<LOAD_BALANCER_IP>` |
| girlfanz.com | A | @ | `<LOAD_BALANCER_IP>` |
| girlfanz.com | A | www | `<LOAD_BALANCER_IP>` |
| pupfanz.com | A | @ | `<LOAD_BALANCER_IP>` |
| pupfanz.com | A | www | `<LOAD_BALANCER_IP>` |
| transfanz.com | A | @ | `<LOAD_BALANCER_IP>` |
| transfanz.com | A | www | `<LOAD_BALANCER_IP>` |
| taboofanz.com | A | @ | `<LOAD_BALANCER_IP>` |
| taboofanz.com | A | www | `<LOAD_BALANCER_IP>` |

---

## Step 5: Configure GitHub CI/CD (5 min)

Go to: `https://github.com/FanzCEO/BoyFanzV1/settings/secrets/actions`

Add secrets:

```
DO_API_TOKEN = <your-digitalocean-api-token>
DO_REGISTRY_TOKEN = <your-registry-token>
DO_CLUSTER_NAME = fanz-production
```

Now every push to `main` auto-deploys!

---

## Step 6: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n fanz-ecosystem

# Check services
kubectl get services -n fanz-ecosystem

# Check ingress
kubectl get ingress -n fanz-ecosystem

# Test health endpoints
curl https://boyfanz.com/api/health
curl https://girlfanz.com/api/health
curl https://pupfanz.com/api/health
curl https://transfanz.com/api/health
curl https://taboofanz.com/api/health
```

Expected response:
```json
{"status": "healthy", "platform": "BoyFanz"}
```

---

## 🎉 Done!

Your platforms are now live at:

- 🔵 **BoyFanz**: https://boyfanz.com
- 🌸 **GirlFanz**: https://girlfanz.com
- 🐾 **PupFanz**: https://pupfanz.com
- 🏳️‍⚧️ **TransFanz**: https://transfanz.com
- 🔞 **TabooFanz**: https://taboofanz.com

---

## Optional: Local Testing First

Test everything locally before deploying:

```bash
# Start with Docker Compose
docker-compose up -d

# Access locally:
# BoyFanz:   http://localhost:5001
# GirlFanz:  http://localhost:5002
# PupFanz:   http://localhost:5003
# TransFanz: http://localhost:5004
# TabooFanz: http://localhost:5005
```

---

## Monitoring & Scaling

```bash
# View logs
kubectl logs -f deployment/boyfanz -n fanz-ecosystem

# Scale manually
kubectl scale deployment boyfanz --replicas=5 -n fanz-ecosystem

# Auto-scaling is configured:
# - CPU > 70% → adds pods
# - Memory > 80% → adds pods
# - Max 10 pods per platform
```

---

## Troubleshooting

### Pods not starting?
```bash
kubectl describe pod <pod-name> -n fanz-ecosystem
kubectl logs <pod-name> -n fanz-ecosystem
```

### SSL not working?
```bash
kubectl get certificates -n fanz-ecosystem
kubectl describe certificate boyfanz-tls -n fanz-ecosystem
```

### Need to rollback?
```bash
kubectl rollout undo deployment/boyfanz -n fanz-ecosystem
```

---

## Support

- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **GitHub Issues**: https://github.com/FanzCEO/BoyFanzV1/issues
- **Digital Ocean Docs**: https://docs.digitalocean.com/products/kubernetes/

---

**Happy deploying! 🚀**
