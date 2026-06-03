# Bitirme Backend

ASP.NET Core 9.0 Web API — Agentic AI Action Plan Backend

## Teknoloji Stack

- ASP.NET Core 9.0
- PostgreSQL + Entity Framework Core
- JWT Authentication + Refresh Token
- Serilog, Polly, QuestPDF, FluentValidation
- xUnit + Moq + FluentAssertions

## Proje Yapısı

```
src/
  BitirmeBackend.Api          — Controllers, Middleware, Extensions
  BitirmeBackend.Application  — Services, Interfaces, DTOs, Validators
  BitirmeBackend.Domain       — Entities, Enums, Common
  BitirmeBackend.Infrastructure — Persistence, Repositories, ML Client, Auth
  BitirmeBackend.Contracts    — Request/Response DTOs
tests/
  BitirmeBackend.Tests        — xUnit tests
```

## Başlangıç

1. `appsettings.example.json` dosyasını `appsettings.Development.json` olarak kopyala ve değerleri doldur.
2. `dotnet restore`
3. `dotnet run --project src/BitirmeBackend.Api`

## ML Servis

FastAPI servisi `http://localhost:8001` üzerinde çalışmalıdır.
Bkz: `../bitirme-ml/ml_action_recommendation_service`
