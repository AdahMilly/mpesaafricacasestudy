param location string
param prefix string
@secure()
param dbPassword string

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: '${prefix}-kv'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
  }
}

resource secret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: 'db-password'
  parent: keyVault
  properties: {
    value: dbPassword
  }
}
