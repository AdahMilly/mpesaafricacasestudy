param location string = 'westeurope'
param prefix string = 'casestudy'

param dbUser string
@secure()
param dbPassword string

module network './network.bicep' = {
  name: 'networkModule'
  params: {
    location: location
    prefix: prefix
  }
}

module keyvault './keyvault.bicep' = {
  name: 'kvModule'
  params: {
    location: location
    prefix: prefix
    dbPassword: dbPassword
  }
}

module database './database.bicep' = {
  name: 'dbModule'
  params: {
    location: location
    prefix: prefix
    dbUser: dbUser
    dbPassword: dbPassword
    subnetId: network.outputs.privateSubnetId
  }
}

module app './app.bicep' = {
  name: 'appModule'
  params: {
    location: location
    prefix: prefix
    dbHost: database.outputs.dbHost
    dbPassword: dbPassword
  }
}
