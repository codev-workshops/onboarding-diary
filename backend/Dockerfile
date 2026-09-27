# syntax=docker/dockerfile:1

# ---- build stage: Gradle wrapper on JDK 24 -> bootJar ----------------------
FROM eclipse-temurin:24-jdk AS build
WORKDIR /workspace

COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
# Optional secret `gradle-init`: a Gradle init script (e.g. a repository mirror)
# for networks that cannot reach Maven Central directly. Ignored when absent.
RUN --mount=type=cache,target=/root/.gradle \
    --mount=type=secret,id=gradle-init,target=/root/.gradle/init.d/local.init.gradle.kts,required=false \
    ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN --mount=type=cache,target=/root/.gradle \
    --mount=type=secret,id=gradle-init,target=/root/.gradle/init.d/local.init.gradle.kts,required=false \
    ./gradlew --no-daemon bootJar -x test \
    && cp build/libs/*.jar /workspace/app.jar

# ---- runtime stage: JRE 24, non-root ---------------------------------------
FROM eclipse-temurin:24-jre AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home /app app
COPY --from=build --chown=app:app /workspace/app.jar /app/app.jar
USER app

ENV SPRING_PROFILES_ACTIVE=""
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
