package com.example.jira;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.io.File;
import java.nio.file.Files;

@SpringBootApplication
@EnableScheduling
public class JiraApplication {

	private static final Logger logger = LoggerFactory.getLogger(JiraApplication.class);

	public static void main(String[] args) {
		loadDotEnv();
		SpringApplication.run(JiraApplication.class, args);
	}

	private static void loadDotEnv() {
		try {
			File envFile = new File(".env");
			if (envFile.exists()) {
				Files.lines(envFile.toPath())
					.map(String::trim)
					.filter(line -> !line.isEmpty() && !line.startsWith("#"))
					.forEach(line -> {
						int delimiterIdx = line.indexOf('=');
						if (delimiterIdx > 0) {
							String key = line.substring(0, delimiterIdx).trim();
							String value = line.substring(delimiterIdx + 1).trim();
							// Strip quotes if present
							if (value.startsWith("\"") && value.endsWith("\"")) {
								value = value.substring(1, value.length() - 1);
							} else if (value.startsWith("'") && value.endsWith("'")) {
								value = value.substring(1, value.length() - 1);
							}
							System.setProperty(key, value);
						}
					});
				System.out.println("Loaded environment variables from local .env file.");
			}
		} catch (Exception e) {
			System.err.println("Failed to load local .env file: " + e.getMessage());
		}
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		logger.info("==========================================================");
		logger.info("  Jira Clone Application is UP and running!");
		logger.info("  Port: " + (System.getProperty("server.port") != null ? System.getProperty("server.port") : "8080"));
		logger.info("  Ready to process requests and keep-alive health pings.");
		logger.info("==========================================================");
	}

}
