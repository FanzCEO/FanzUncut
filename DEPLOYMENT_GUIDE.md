# FANZ Ecosystem - Kubernetes Deployment Guide

Complete guide to deploying the BoyFanz, GirlFanz, PupFanz, TransFanz, and TabooFanz platforms to Digital Ocean Kubernetes.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Digital Ocean Setup](#digital-ocean-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Domain Configuration](#domain-configuration)
- [Monitoring & Scaling](#monitoring--scaling)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Tools

1. **Digital Ocean Account** with billing enabled
2. **GitHub Account** with repository access
3. **Domain Names** registered:
   - boyfanz.com
   - girlfanz.com
   - pupfanz.com
   - transfanz.com
   - taboofanz.com

### Install Required Tools

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install doctl (DigitalOcean CLI)
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.100.0/doctl-1.100.0-linux-amd64.tar.gz
tar xf doctl-1.100.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin
```

---

## Digital Ocean Setup

### 1. Create Kubernetes Cluster

```bash
# Authenticate with Digital Ocean
doctl auth init

# Create DOKS cluster (3 nodes, 4GB RAM each)
doctl kubernetes cluster create fanz-production \
  --region nyc3 \
  --size s-2vcpu-4gb \
  --count 3 \
  --auto-upgrade=true \
  --ha=false

# Get cluster credentials
doctl kubernetes cluster kubeconfig save fanz-production
```

### 2. Create Container Registry

```bash
# Create private container registry
doctl registry create fanz

# Get registry credentials
doctl registry login
```

### 3. Create Managed PostgreSQL Database

```bash
# Create production database
doctl databases create fanz-db \
  --engine pg \
  --version 16 \
  --region nyc3 \
  --size db-s-2vcpu-4gb \
  --num-nodes 1

# Get connection details
doctl databases connection fanz-db
```

### 4. Create Redis Cache

```bash
# Create Redis cluster
doctl databases create fanz-redis \
  --engine redis \
  --version 7 \
  --region nyc3 \
  --size db-s-1vcpu-1gb

# Get connection URL
doctl databases connection fanz-redis
```

### 5. Create Object Storage (Spaces)

```bash
# Create Spaces bucket for media
doctl compute space create fanz-media \
  --region nyc3

# Generate access keys
doctl compute space key create fanz-spaces-key
```

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/FanzCEO/BoyFanzV1.git
cd BoyFanzV1
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.production.template .env

# Edit with your values
nano .env
```

**Required Environment Variables:**
```env
SESSION_SECRET=your-random-64-char-string
JWT_SECRET=your-random-64-char-string
DATABASE_URL=postgresql://user:pass@localhost:5432/fanz_db
REDIS_URL=redis://localhost:6379
```

### 3. Test Locally with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Access platforms:
# BoyFanz:   http://localhost:5001
# GirlFanz:  http://localhost:5002
# PupFanz:   http://localhost:5003
# TransFanz: http://localhost:5004
# TabooFanz: http://localhost:5005

# Stop services
docker-compose down
```

---

## Production Deployment

### 1. Configure GitHub Secrets

Go to: `https://github.com/FanzCEO/BoyFanzV1/settings/secrets/actions`

Add these secrets:

```
DO_API_TOKEN            = Your DigitalOcean API token
DO_REGISTRY_TOKEN       = Your DO Container Registry token
DO_CLUSTER_NAME         = fanz-production
SLACK_WEBHOOK_URL       = Your Slack webhook (optional)
SNYK_TOKEN             = Your Snyk security token (optional)
```

### 2. Configure Kubernetes Secrets

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets from .env file
kubectl create secret generic fanz-secrets \
  --from-env-file=.env.production \
  -n fanz-ecosystem

# Verify secret creation
kubectl get secrets -n fanz-ecosystem
```

### 3. Apply ConfigMaps

```bash
# Apply application config
kubectl apply -f k8s/configmaps/app-config.yaml

# Verify
kubectl get configmaps -n fanz-ecosystem
```

### 4. Create Storage Volumes

```bash
# Apply persistent volume claims
kubectl apply -f k8s/storage/persistent-volume.yaml

# Verify
kubectl get pvc -n fanz-ecosystem
```

### 5. Deploy Applications

```bash
# Deploy all platform services
kubectl apply -f k8s/deployments/

# Deploy services
kubectl apply -f k8s/services/

# Apply auto-scaling rules
kubectl apply -f k8s/hpa/autoscaling.yaml

# Check deployments
kubectl get deployments -n fanz-ecosystem
kubectl get pods -n fanz-ecosystem
```

### 6. Install NGINX Ingress Controller

```bash
# Install ingress-nginx
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# Wait for load balancer IP
kubectl get service ingress-nginx-controller -n ingress-nginx --watch
```

### 7. Install Cert-Manager (SSL)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Create Let's Encrypt issuer
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
```

### 8. Apply Ingress Rules

```bash
# Apply ingress configuration
kubectl apply -f k8s/ingress/ingress.yaml

# Verify ingress
kubectl get ingress -n fanz-ecosystem
kubectl describe ingress fanz-ingress -n fanz-ecosystem
```

---

## Domain Configuration

### 1. Get Load Balancer IP

```bash
kubectl get service ingress-nginx-controller -n ingress-nginx
```

Copy the `EXTERNAL-IP` value.

### 2. Configure DNS Records

For **each domain** (boyfanz.com, girlfanz.com, etc.), add these DNS records:

```
Type    Name    Value                   TTL
A       @       <LOAD_BALANCER_IP>      3600
A       www     <LOAD_BALANCER_IP>      3600
```

**Example for BoyFanz.com:**
```
A       @       64.23.145.22            3600
A       www     64.23.145.22            3600
```

### 3. Verify SSL Certificates

```bash
# Check certificate status
kubectl get certificates -n fanz-ecosystem

# Should show "Ready: True" for all domains
```

---

## CI/CD Automated Deployment

### Automatic Deployment on Push

Every push to `main` branch triggers:

1. ✅ Build Docker images for all 5 platforms
2. ✅ Push to Digital Ocean Container Registry
3. ✅ Deploy to Kubernetes cluster
4. ✅ Rolling update (zero downtime)
5. ✅ Slack notification

### Manual Deployment

```bash
# From GitHub Actions tab:
1. Go to "Deploy FANZ Ecosystem to Production"
2. Click "Run workflow"
3. Select branch: main
4. Click "Run workflow"
```

---

## Monitoring & Scaling

### View Application Status

```bash
# Check all pods
kubectl get pods -n fanz-ecosystem

# Check services
kubectl get services -n fanz-ecosystem

# Check horizontal autoscalers
kubectl get hpa -n fanz-ecosystem

# View logs
kubectl logs -f deployment/boyfanz -n fanz-ecosystem
kubectl logs -f deployment/girlfanz -n fanz-ecosystem
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment boyfanz --replicas=5 -n fanz-ecosystem

# Auto-scaling is configured:
# - Min replicas: 2-3 per platform
# - Max replicas: 8-10 per platform
# - Triggers: CPU > 70%, Memory > 80%
```

### Resource Usage

```bash
# Check resource consumption
kubectl top nodes
kubectl top pods -n fanz-ecosystem

# Check cluster capacity
kubectl describe nodes
```

---

## Monitoring Dashboards

### Access Kubernetes Dashboard

```bash
# Install dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Create admin user
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# Get access token
kubectl -n kubernetes-dashboard create token admin-user

# Access dashboard
kubectl proxy
# Visit: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n fanz-ecosystem

# Check logs
kubectl logs <pod-name> -n fanz-ecosystem

# Common issues:
# 1. Missing secrets
kubectl get secrets -n fanz-ecosystem

# 2. Image pull errors
kubectl describe pod <pod-name> -n fanz-ecosystem | grep -i pull

# 3. Resource limits
kubectl describe nodes
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -- \
  psql "postgresql://user:pass@db-host:25060/fanz_production?sslmode=require"

# Check database credentials in secret
kubectl get secret fanz-secrets -n fanz-ecosystem -o yaml
```

### SSL Certificate Issues

```bash
# Check certificate status
kubectl describe certificate boyfanz-tls -n fanz-ecosystem

# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager

# Manually trigger certificate renewal
kubectl delete certificate boyfanz-tls -n fanz-ecosystem
kubectl apply -f k8s/ingress/ingress.yaml
```

### Rolling Back Deployment

```bash
# View deployment history
kubectl rollout history deployment/boyfanz -n fanz-ecosystem

# Rollback to previous version
kubectl rollout undo deployment/boyfanz -n fanz-ecosystem

# Rollback to specific revision
kubectl rollout undo deployment/boyfanz --to-revision=2 -n fanz-ecosystem
```

---

## Health Checks

### Platform Health Endpoints

```bash
# Check if platforms are responding
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

## Backup & Recovery

### Database Backup

```bash
# Create manual backup
doctl databases backup create <database-id>

# List backups
doctl databases backup list <database-id>

# Restore from backup
doctl databases restore <database-id> <backup-id>
```

### Application State Backup

```bash
# Backup all Kubernetes resources
kubectl get all -n fanz-ecosystem -o yaml > fanz-backup.yaml

# Backup secrets (encrypt before storing!)
kubectl get secrets -n fanz-ecosystem -o yaml > fanz-secrets-backup.yaml
```

---

## Cost Optimization

### Current Infrastructure Costs (Estimated)

- **Kubernetes Cluster**: ~$72/month (3 x $24 droplets)
- **PostgreSQL Database**: ~$60/month (db-s-2vcpu-4gb)
- **Redis Cache**: ~$15/month (db-s-1vcpu-1gb)
- **Container Registry**: ~$5/month
- **Object Storage**: ~$5/month + bandwidth
- **Load Balancer**: ~$12/month

**Total: ~$169-200/month**

### Scaling Recommendations

**For 100K+ users:**
- Increase node count to 6-10
- Upgrade database to db-s-4vcpu-8gb
- Enable Redis cluster mode
- Use CDN (Cloudflare/BunnyCDN)

**For 1M+ users:**
- Regional multi-cluster setup
- Read replicas for database
- Object storage with CDN
- Advanced auto-scaling rules

---

## Security Best Practices

1. **Rotate secrets regularly** (every 90 days)
2. **Enable DDoS protection** via Cloudflare
3. **Use private networking** between services
4. **Regular security scans** (GitHub Actions)
5. **Monitor audit logs** for suspicious activity
6. **Keep Kubernetes updated** (auto-upgrade enabled)

---

## Support & Resources

- **Digital Ocean Docs**: https://docs.digitalocean.com/products/kubernetes/
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **GitHub Repository**: https://github.com/FanzCEO/BoyFanzV1
- **Slack Alerts**: Configure SLACK_WEBHOOK_URL for notifications

---

## Quick Reference Commands

```bash
# Deploy everything in one command
kubectl apply -f k8s/namespace.yaml && \
kubectl apply -f k8s/configmaps/ && \
kubectl apply -f k8s/storage/ && \
kubectl apply -f k8s/deployments/ && \
kubectl apply -f k8s/services/ && \
kubectl apply -f k8s/hpa/ && \
kubectl apply -f k8s/ingress/

# Check overall status
kubectl get all -n fanz-ecosystem

# Get cluster info
kubectl cluster-info

# Emergency rollback all services
kubectl rollout undo deployment --all -n fanz-ecosystem
```

---

## Next Steps After Deployment

1. ✅ Configure payment providers (CCBill, Segpay, Epoch)
2. ✅ Set up monitoring dashboards (Grafana/Prometheus)
3. ✅ Configure email service (SendGrid/Resend)
4. ✅ Enable AI features (add OpenAI/ElevenLabs keys)
5. ✅ Configure CDN for media delivery
6. ✅ Set up backup automation
7. ✅ Load testing and optimization

---

**🚀 Your FANZ Ecosystem is now deployed to production!**
