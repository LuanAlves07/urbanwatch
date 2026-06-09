# =====================================================
# UrbanWatch — imagem de container para deploy em nuvem
# Multi-stage: build com Maven (JDK 21) e runtime enxuto (JRE 21)
# =====================================================

# ---- Etapa 1: build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---- Etapa 2: runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/urbanwatch-0.0.1-SNAPSHOT.jar app.jar

# Variaveis esperadas em producao (sobrescrevem os fallbacks de dev):
#   DB_URL, DB_USER, DB_PASSWORD, JWT_SECRET
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
