FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY apps/api/MedSync.sln apps/api/
COPY apps/api/src/MedSync.Domain/MedSync.Domain.csproj apps/api/src/MedSync.Domain/
COPY apps/api/src/MedSync.Application/MedSync.Application.csproj apps/api/src/MedSync.Application/
COPY apps/api/src/MedSync.Infrastructure/MedSync.Infrastructure.csproj apps/api/src/MedSync.Infrastructure/
COPY apps/api/src/MedSync.Api/MedSync.Api.csproj apps/api/src/MedSync.Api/
RUN dotnet restore apps/api/MedSync.sln

COPY apps/api/ apps/api/
RUN dotnet publish apps/api/src/MedSync.Api/MedSync.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "MedSync.Api.dll"]

