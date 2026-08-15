FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY OnboardingDiary.Api/OnboardingDiary.Api.csproj OnboardingDiary.Api/
RUN dotnet restore OnboardingDiary.Api/OnboardingDiary.Api.csproj
COPY . .
RUN dotnet publish OnboardingDiary.Api/OnboardingDiary.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5080
ENTRYPOINT ["dotnet", "OnboardingDiary.Api.dll"]
