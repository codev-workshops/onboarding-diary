package com.codev.onboardingdiary.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.deser.std.StringDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import java.io.IOException;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Shared infrastructure beans. */
@Configuration
public class CoreConfig {

  @Bean
  Clock clock() {
    return Clock.systemDefaultZone();
  }

  /** Trims every incoming JSON string so blank-after-trim values fail {@code @NotBlank}. */
  @Bean
  Module trimStringsModule() {
    SimpleModule module = new SimpleModule("trim-strings");
    module.addDeserializer(
        String.class,
        new StringDeserializer() {
          @Override
          public String deserialize(JsonParser parser, DeserializationContext context)
              throws IOException {
            String value = super.deserialize(parser, context);
            return value == null ? null : value.strip();
          }
        });
    return module;
  }
}
