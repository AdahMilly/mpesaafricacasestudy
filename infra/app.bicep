param location string
param prefix string
param dbHost string
@secure()
param dbPassword string

resource env 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-env'
  location: location
}

resource app 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-app'
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      secrets: [
        {
          name: 'db-password'
          value: dbPassword
        }
      ]
      ingress: {
        external: true
        targetPort: 3000
      }
    }
    template: {
      containers: [
        {
          name: 'app'
          image: 'myrepo/app:latest'
          resources: {
            cpu: 1
            memory: '1Gi'
          }
          env: [
            {
              name: 'DB_HOST'
              value: dbHost
            }
            {
              name: 'DB_PASSWORD'
              secretRef: 'db-password'
            }
          ]
        }
      ]
    }
  }
}
