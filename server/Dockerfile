# ---- Build stage ----
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml first to cache Maven dependencies download
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy src and build the application
COPY src ./src
RUN mvn clean package -DskipTests

# ---- Run stage ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Render provides the PORT env variable dynamically
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
