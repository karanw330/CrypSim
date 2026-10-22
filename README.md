# CrypSim — CI/CD Deployment

CrypSim is a cryptocurrency trading simulator built with **FastAPI and WebSockets**, deployed on AWS EC2 using **Jenkins, Docker, Amazon ECR, and Kubernetes (Minikube)**.

## Dockerfile

The [Dockerfile](Dockerfile) uses `python:3.11-slim`, installs system packages and dependencies from `requirements.txt`, and copies the application into `/app`. It exposes port **8000**, includes a health check using the `/ping` endpoint, and runs the FastAPI application with **Uvicorn**.

## Jenkins CI/CD Pipeline

A GitHub webhook triggers the [Jenkinsfile](Jenkinsfile) pipeline for the `EC2` branch. Jenkins runs on an AWS EC2 instance with Docker and Minikube installed.

1. **Checkout:** Retrieves the application source code from GitHub.
2. **Syntax Check:** Validates Python files using Python's AST parser in a temporary Docker container.
3. **Docker Build:** Builds the CrypSim application image from the Dockerfile.
4. **Push to ECR:** Authenticates with Amazon ECR in `ap-south-1`, tags the image with the Jenkins build number, and pushes it.
5. **Deploy to Kubernetes:** Refreshes the ECR pull Secret, applies Kubernetes manifests, and updates the Deployment to the new image version.
6. **Verify and Expose:** Waits for the rollout to complete, checks Pods and Services, starts port forwarding on port **8000**, and verifies the `/ping` endpoint.

## Kubernetes Configuration

**[deployment.yaml](deployment.yaml):** Configures the CrypSim Deployment with **2 replicas**, a readiness probe, and Kubernetes Secrets for application environment variables and ECR image pulls.

**[service.yaml](service.yaml):** Exposes the Pods through a **NodePort Service**, mapping service port **8000** to container port **8000** with NodePort **30007**.

## Verification

```bash
kubectl get pods,deploy,svc
kubectl rollout status deployment/crypsim-deployment
curl http://localhost:8000/ping
```

The health endpoint responds with `{"status":"ok"}`.
