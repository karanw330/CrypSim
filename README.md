# CrypSim — CCA-2 CI/CD Deployment

CrypSim is a **FastAPI and WebSocket-based cryptocurrency trading simulator** deployed on **AWS EC2** using Jenkins, Docker, Amazon ECR, and Kubernetes (Minikube).

## Setup
- **GitHub webhook** triggers Jenkins on pushes to the `EC2` branch.
- **EC2** hosts Jenkins, Docker, and a single-node Minikube cluster; an **Elastic IP** provides a stable public address.
- **Amazon ECR** (`ap-south-1`) stores versioned Docker images.
- Kubernetes uses `crypsim-env` for application environment variables and `ecr-secret` for image pulls.

## CI/CD Pipeline
The [Jenkinsfile](Jenkinsfile) automates:

1. **Checkout** — fetch source code from GitHub.
2. **Syntax Check** — validate Python files.
3. **Docker Build** — build the application image.
4. **Push to ECR** — push an image tagged with the Jenkins build number.
5. **Deploy to Kubernetes** — refresh ECR credentials, apply manifests, and update the image.
6. **Verify and Expose** — wait for rollout, check Pods and Services, forward port 8000, and test `/ping`.

## Kubernetes Verification

The [Deployment](deployment.yaml) specifies **2 replicas**; the [Service](service.yaml) uses **NodePort 30007**.

```bash
minikube status
kubectl get nodes
kubectl get pods,deploy,svc
kubectl rollout status deployment/crypsim-deployment
curl http://localhost:8000/ping
```

Health response: `{"status":"ok"}`. Application: `http://EC2_PUBLIC_IP:8000/login` (with port 8000 permitted by the EC2 security group).

## CCA-2 Demonstration

1. Push a change to the `EC2` branch and show the successful Jenkins pipeline and running Kubernetes Pods.
2. Make a second small code change, push again, and show the **new Jenkins build, updated image, and successful redeployment**.

> **Note:** CrypSim currently uses SQLite without a Kubernetes persistent volume. Pod replacement can lose local database data; the two replicas do not share a database.
