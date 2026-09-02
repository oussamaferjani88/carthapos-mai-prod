# Metabase 52 (OSS) requires Java 21.
# The jar is ~406MB and gitignored, so we download it at build time from the
# official Metabase release page instead of COPY-ing from the repo.
FROM eclipse-temurin:21-jre

WORKDIR /app/metabase

# Download Metabase v52 OSS release and copy the optional plugin drivers.
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget ca-certificates && \
    wget -q "https://downloads.metabase.com/v0.52.14/metabase.jar" \
         -O /app/metabase/metabase.jar && \
    apt-get purge -y wget && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY metabase/plugins /app/metabase/plugins

EXPOSE 3000

# MB_DB_TYPE=postgres + MB_DB_* are injected via render.yaml env vars so
# Metabase stores its data on the managed postgres instead of an ephemeral H2.
#
# -Xmx380m keeps the JVM heap within the free web service's 512 MB RAM limit
# (the 406MB jar is on disk, not in RAM; Java needs heap + native overhead,
# so a 512m heap would exceed the container and get OOM-killed with exit 137).
CMD ["java", "-Xmx380m", "-Xms128m", "-XX:+UseContainerSupport", "-jar", "/app/metabase/metabase.jar"]
