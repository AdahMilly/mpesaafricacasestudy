$grp = "myresourcegroup"
$location = "eastus"
$template = "./infra/main.bicep"

az group create --name $grp --location $location

az deployment group create `
  --resource-group $grp `
  --template-file $template `
  --mode Complete `
  --verbose

az group delete --name $grp --yes --no-wait
