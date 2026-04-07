# Build stage — context must be the repo root (context: .)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy solution config files first for layer caching
COPY backend/global.json ./
COPY backend/Directory.Build.props ./
COPY backend/Directory.Packages.props ./
COPY backend/nuget.config ./

# Copy solution file
COPY backend/QorstackReportService.sln ./

# Copy project files for restore layer caching
COPY backend/src/Domain/Domain.csproj ./src/Domain/
COPY backend/src/Application/Application.csproj ./src/Application/
COPY backend/src/Infrastructure/Infrastructure.csproj ./src/Infrastructure/
COPY backend/src/Infrastructure.Pro/Infrastructure.Pro.csproj ./src/Infrastructure.Pro/
COPY backend/src/Infrastructure.SaaS/Infrastructure.SaaS.csproj ./src/Infrastructure.SaaS/
COPY backend/src/Web/Web.csproj ./src/Web/

# Copy test project files
COPY backend/tests/Domain.UnitTests/Domain.UnitTests.csproj ./tests/Domain.UnitTests/
COPY backend/tests/Application.UnitTests/Application.UnitTests.csproj ./tests/Application.UnitTests/
COPY backend/tests/Application.FunctionalTests/Application.FunctionalTests.csproj ./tests/Application.FunctionalTests/
COPY backend/tests/Infrastructure.IntegrationTests/Infrastructure.IntegrationTests.csproj ./tests/Infrastructure.IntegrationTests/

# Restore dependencies
RUN dotnet restore

# Copy the rest of the backend source
COPY backend/ .

# Build and publish
RUN dotnet publish src/Web/Web.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
LABEL org.opencontainers.image.source="https://github.com/qorstack/qorstack-report"
LABEL org.opencontainers.image.url="https://qorstack.com"
LABEL org.opencontainers.image.title="Qorstack Report API"
LABEL org.opencontainers.image.description="Generate PDF and Excel reports from DOCX/XLSX templates"
WORKDIR /app

USER root

# Install runtime dependencies — PDF rendering is delegated to the Gotenberg sidecar
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl \
        fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and set timezone before copying files
ENV TZ=Asia/Bangkok
RUN groupadd -r appuser && useradd -r -g appuser -m appuser && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy published application with correct ownership in one layer (avoids chown duplicate)
COPY --chown=appuser:appuser --from=build /app/publish .

# Bundle database migrations into the image (no host mount required)
COPY --chown=appuser:appuser database/*.sql /app/database/

# Install custom fonts and rebuild font cache — all in one layer
RUN mkdir -p /usr/share/fonts/truetype/thaisansneue /usr/share/fonts/truetype/ocrb && \
    { cp -r /app/Resources/Font/ThaiSansNeue-Font/. /usr/share/fonts/truetype/thaisansneue/ 2>/dev/null || true; } && \
    { cp -r /app/Resources/Font/OCRB/. /usr/share/fonts/truetype/ocrb/ 2>/dev/null || true; } && \
    chown -R appuser:appuser /usr/share/fonts/truetype/thaisansneue /usr/share/fonts/truetype/ocrb && \
    fc-cache -fv

USER appuser

EXPOSE 8080

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "QorstackReportService.Web.dll"]
