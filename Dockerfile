# OurBloom: tek imaj (ASP.NET Core API + derlenmiş React arayüzü)
# docker compose --profile app up -d --build

FROM node:22-alpine AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY backend/OurBloom.Api/OurBloom.Api.csproj backend/OurBloom.Api/
RUN dotnet restore backend/OurBloom.Api/OurBloom.Api.csproj
COPY backend/ backend/
RUN dotnet publish backend/OurBloom.Api/OurBloom.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /src/frontend/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080 \
    Storage__Root=/data
# Görseller ve oturum anahtarları için yazılabilir klasör (root olmayan kullanıcıya ait)
RUN mkdir -p /data && chown $APP_UID /data
VOLUME /data
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "OurBloom.Api.dll"]
