pipeline {
    agent any

    environment {
        // You can change these variables directly here or in the deploy-iis.ps1 script
        BACKEND_DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\plusgrow-api'
        FRONTEND_DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\plusgrow-app'
        APP_POOL_NAME = 'PlusGrowApiAppPool'
    }

    stages {
        stage('Deploy to IIS') {
            steps {
                script {
                    echo "Starting Deployment to IIS..."
                    // Execute the PowerShell script that handles the build and copy
                    powershell '''
                        .\\deploy-iis.ps1 -BackendDeployPath $env:BACKEND_DEPLOY_PATH -FrontendDeployPath $env:FRONTEND_DEPLOY_PATH -AppPoolName $env:APP_POOL_NAME
                    '''
                }
            }
        }
    }
    
    post {
        always {
            echo "Deployment Pipeline completed."
        }
        success {
            echo "✅ Successfully deployed application."
        }
        failure {
            echo "❌ Deployment failed. Check the logs for more details."
        }
    }
}
