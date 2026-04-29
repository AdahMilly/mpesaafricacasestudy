param location string
param prefix string
param dbUser string
@secure()
param dbPassword string
param subnetId string

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${prefix}-pg'
  location: location
  properties: {
    administratorLogin: dbUser
    administratorLoginPassword: dbPassword
    version: '14'
    network: {
      delegatedSubnetResourceId: subnetId
    }
  }
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
}

output dbHost string = postgres.name
