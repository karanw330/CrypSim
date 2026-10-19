pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '448842988820'
        ECR_REPOSITORY = 'crypsim'
        IMAGE_NAME = 'crypsim-image'
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

        stage('Docker Build') {
            steps {
                echo 'Building Docker container...'
                sh 'docker build -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Container Test') {
            steps {
                echo 'Testing import integrity inside the built container...'
                sh 'docker run --rm ${IMAGE_NAME}:latest python3 -m py_compile main.py'
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
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
        success {
            echo "Successfully built and pushed ${ECR_IMAGE_LATEST} and build tag #${BUILD_NUMBER} to ECR!"
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
