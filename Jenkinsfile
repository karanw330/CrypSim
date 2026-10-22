pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '448842988820'
        ECR_REPOSITORY = 'crypsim'
        IMAGE_NAME = 'crypsim-image'
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        ECR_IMAGE_LATEST = "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
        ECR_IMAGE_BUILD = "${ECR_REGISTRY}/${ECR_REPOSITORY}:${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Syntax Check') {
            steps {
                echo 'Checking Python syntax before Docker build...'
                sh 'docker run --rm -v "$WORKSPACE:/src:ro" -w /src python:3.11-slim python -m compileall -q .'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker container...'
                sh 'docker build -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Container Test') {
            steps {
                echo 'Testing container /ping...'
                sh '''
                    container_id=$(docker run -d ${IMAGE_NAME}:latest)
                    trap 'docker rm -f "$container_id" >/dev/null 2>&1 || true' EXIT

                    healthy=0
                    for attempt in $(seq 1 30); do
                        if docker exec "$container_id" curl --fail --silent http://localhost:8000/ping | grep -q '"status":"ok"'; then
                            healthy=1
                            break
                        fi
                        if ! docker inspect -f '{{.State.Running}}' "$container_id" | grep -q true; then
                            docker logs "$container_id"
                            break
                        fi
                        sleep 2
                    done
                    if [ "$healthy" -ne 1 ]; then
                        docker logs "$container_id"
                        exit 1
                    fi
                    echo 'Application /ping health check passed.'
                '''
            }
        }

        stage('ECR Login') {
            steps {
                echo 'Authenticating with AWS ECR...'
                sh '''
                aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Docker Tag') {
            steps {
                echo 'Tagging image for ECR...'
                sh 'docker tag ${IMAGE_NAME}:latest ${ECR_IMAGE_BUILD}'
                sh 'docker tag ${IMAGE_NAME}:latest ${ECR_IMAGE_LATEST}'
            }
        }

        stage('Push to ECR') {
            steps {
                echo 'Pushing image to ECR...'
                sh 'docker push ${ECR_IMAGE_BUILD}'
                sh 'docker push ${ECR_IMAGE_LATEST}'
            }
        }

        stage('Refresh ECR Pull Secret') {
            steps {
                echo 'Refreshing Kubernetes ECR image-pull credentials...'
                sh '''
                    set +x
                    ECR_PASSWORD=$(aws ecr get-login-password --region "$AWS_REGION")
                    test -n "$ECR_PASSWORD"
                    kubectl create secret docker-registry ecr-secret \
                        --docker-server="$ECR_REGISTRY" \
                        --docker-username=AWS \
                        --docker-password="$ECR_PASSWORD" \
                        --dry-run=client -o yaml | kubectl apply -f -
                    unset ECR_PASSWORD
                '''
            }
        }

        stage('Deploy to Minikube') {
            steps {
                echo 'Applying Kubernetes manifests and deploying this build...'
                sh '''
                    kubectl get secret crypsim-env >/dev/null
                    kubectl apply -f deployment.yaml
                    kubectl apply -f service.yaml
                    kubectl set image deployment/crypsim-deployment crypsim="$ECR_IMAGE_BUILD"
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Waiting for Kubernetes rollout...'
                sh '''
                    kubectl rollout status deployment/crypsim-deployment --timeout=180s
                    kubectl get pods
                    kubectl get deployments
                    kubectl get services
                '''
            }
        }
        stage('Post-Deployment Health Test') {
            steps {
                echo 'Testing /ping through Kubernetes Service...'
                sh '''
                    kubectl port-forward service/crypsim-service 18080:8000 > port-forward.log 2>&1 &
                    forward_pid=$!
                    trap 'kill "$forward_pid" 2>/dev/null || true' EXIT
                    healthy=0
                    for attempt in $(seq 1 30); do
                        if curl --fail --silent --max-time 3 http://127.0.0.1:18080/ping | grep -q '"status":"ok"'; then
                            healthy=1
                            break
                        fi
                        sleep 2
                    done
                    if [ "$healthy" -ne 1 ]; then
                        cat port-forward.log
                        exit 1
                    fi
                    echo 'Deployed /ping test passed.'
                '''
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
        success {
            echo "Successfully built, tested, pushed and deployed build #${BUILD_NUMBER} to Minikube!"
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
