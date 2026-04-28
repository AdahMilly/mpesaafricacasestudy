
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

COPY casestudy_api.sln ./
COPY casestudy_api/*.csproj ./casestudy_api/

RUN dotnet restore --no-cache

COPY . .

WORKDIR /src/casestudy_api

RUN dotnet publish -c Release -o /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/publish .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

ENTRYPOINT ["dotnet", "casestudy_api.dll"]