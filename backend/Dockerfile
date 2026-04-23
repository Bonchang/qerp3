FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

COPY gradlew gradlew
COPY gradle gradle
COPY settings.gradle build.gradle ./
COPY src src

RUN chmod +x gradlew \
    && ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
