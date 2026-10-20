# CrypSim — AWS EC2 CI/CD

This branch deploys **CrypSim**, a FastAPI/WebSocket cryptocurrency trading simulator, using Jenkins, Docker, Amazon ECR, and Kubernetes on Minikube.

## Infrastructure

- **AWS EC2** runs Jenkins, Docker, and Minikube. An **Elastic IP** provides a stable public address for accessing Jenkins.
- A **GitHub webhook** triggers the Jenkins pipeline when changes are pushed to the `EC2` branch.
- **Amazon ECR (`ap-south-1`)** stores the `crypsim` Docker image.

## Jenkins Pipeline

Defined in [`Jenkinsfile`](Jenkinsfile):

1. **Checkout:** Pull the latest repository code.
2. **Docker Build:** Build the application image using [`Dockerfile`](Dockerfile).
3. **Container Test:** Run `python3 -m py_compile main.py` inside the image.
4. **ECR Login & Tag:** Authenticate to ECR; tag the image as `latest` and with the Jenkins build number.
5. **Push to ECR:** Publish both image tags.

## Minikube Deployment

The Kubernetes files define a **2-replica Deployment** and a **NodePort Service** (port `30007`). Configure the required Kubernetes Secrets, `ecr-secret` for pulling from ECR and `crypsim-env` for application settings, before deploying.

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl get pods,deploy,svc
kubectl port-forward svc/crypsim-service 8000:8000
```

In another terminal on the same host, verify the health endpoint:

```bash
curl http://localhost:8000/ping
# {"status":"ok"}
```

**Note:** The current Jenkins pipeline builds, tests, and pushes images; Kubernetes deployment is performed separately with `kubectl`.

## Demonstrating an Update

Change the application code and push to `EC2`. The GitHub webhook starts another Jenkins build, publishing a new image. Then update the Minikube workload and verify the rollout:

```bash
kubectl rollout restart deployment/crypsim-deployment
kubectl rollout status deployment/crypsim-deployment
```

The `EC2` branch is maintained separately from the main application branch.
