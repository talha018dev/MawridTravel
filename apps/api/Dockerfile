FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY apps/api/MawridTravel.Api.csproj apps/api/
RUN dotnet restore apps/api/MawridTravel.Api.csproj

COPY apps/api/ apps/api/
RUN dotnet publish apps/api/MawridTravel.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "MawridTravel.Api.dll"]
