pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        ECR_REGISTRY = '448842988820.dkr.ecr.ap-south-1.amazonaws.com'
        ECR_IMAGE = "${ECR_REGISTRY}/crypsim"
        KUBECONFIG = '/var/lib/jenkins/.kube/config'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Syntax Check') {
            steps {
                sh '''docker run --rm -v "$WORKSPACE:/src:ro" -w /src python:3.11-slim python -c 'import ast, pathlib; files = list(pathlib.Path(".").rglob("*.py")); [ast.parse(p.read_bytes(), filename=str(p)) for p in files if ".git" not in p.parts]; print("Python syntax OK")' '''
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t crypsim-image:latest .'
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
                    docker tag crypsim-image:latest "$ECR_IMAGE:$BUILD_NUMBER"
                    docker push "$ECR_IMAGE:$BUILD_NUMBER"
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    # ECR image-pull credentials expire, so refresh them each build.
                    set +x
                    ECR_PASSWORD=$(aws ecr get-login-password --region "$AWS_REGION")
                    test -n "$ECR_PASSWORD"
                    kubectl create secret docker-registry ecr-secret \
                        --docker-server="$ECR_REGISTRY" \
                        --docker-username=AWS \
                        --docker-password="$ECR_PASSWORD" \
                        --dry-run=client -o yaml | kubectl apply -f -
                    unset ECR_PASSWORD

                    kubectl get secret crypsim-env
                    kubectl apply -f deployment.yaml
                    kubectl apply -f service.yaml
                    kubectl set image deployment/crypsim-deployment crypsim="$ECR_IMAGE:$BUILD_NUMBER"
                '''
            }
        }

        stage('Verify and Expose') {
            steps {
                sh '''
                    kubectl rollout status deployment/crypsim-deployment --timeout=180s
                    kubectl get pods
                    kubectl get services

                    # Keep a single port-forward running after Jenkins finishes.
                    # The port-forward reaches one selected Pod, not Service load balancing.
                    if [ -f /var/lib/jenkins/crypsim-port-forward.pid ]; then
                        old_pid=$(cat /var/lib/jenkins/crypsim-port-forward.pid)
                        kill "$old_pid" 2>/dev/null || true
                        rm -f /var/lib/jenkins/crypsim-port-forward.pid
                    fi

                    JENKINS_NODE_COOKIE=dontKillMe nohup kubectl port-forward --address 0.0.0.0 svc/crypsim-service 8000:8000 > /var/lib/jenkins/crypsim-port-forward.log 2>&1 < /dev/null &
                    echo $! > /var/lib/jenkins/crypsim-port-forward.pid
                    sleep 3
                    kill -0 "$(cat /var/lib/jenkins/crypsim-port-forward.pid)"
                    curl --fail http://127.0.0.1:8000/ping
                '''
            }
        }
    }

    post {
        success {
            echo 'CrypSim deployed. Open http://EC2_PUBLIC_IP:8000/login'
        }
        failure {
            echo 'Pipeline failed. Check the Jenkins console output.'
        }
    }
}
