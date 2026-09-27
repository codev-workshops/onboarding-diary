package com.onboardingdiary

import com.onboardingdiary.security.BootstrapAdminProperties
import com.onboardingdiary.security.JwtProperties
import com.onboardingdiary.security.PasswordEncoderProperties
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties::class, PasswordEncoderProperties::class, BootstrapAdminProperties::class)
class OnboardingDiaryApplication

fun main(args: Array<String>) {
    runApplication<OnboardingDiaryApplication>(*args)
}
