package com.onboardingdiary.security;

import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService serviceWithSecret(String secret, long ttl) {
        JwtProperties props = new JwtProperties();
        props.setSecret(secret);
        props.setExpirationSeconds(ttl);
        props.setIssuer("onboarding-diary");
        return new JwtService(props);
    }

    private User user() {
        User user = new User();
        user.setEmail("alex@acme.com");
        user.setName("Alex");
        user.setRole(Role.MANAGER);
        try {
            Field field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, 42L);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return user;
    }

    @Test
    void generatesAndParsesToken() {
        JwtService service = serviceWithSecret("a-very-long-test-secret-key-32bytes!!", 3600);

        String token = service.generateToken(user());
        AuthenticatedUser principal = service.parse(token);

        assertThat(principal.id()).isEqualTo(42L);
        assertThat(principal.email()).isEqualTo("alex@acme.com");
        assertThat(principal.role()).isEqualTo("MANAGER");
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        JwtService signer = serviceWithSecret("a-very-long-test-secret-key-32bytes!!", 3600);
        JwtService verifier = serviceWithSecret("a-completely-different-secret-32bytes!", 3600);

        String token = signer.generateToken(user());

        assertThatThrownBy(() -> verifier.parse(token)).isInstanceOf(Exception.class);
    }

    @Test
    void rejectsExpiredToken() {
        JwtService service = serviceWithSecret("a-very-long-test-secret-key-32bytes!!", -1);

        String token = service.generateToken(user());

        assertThatThrownBy(() -> service.parse(token)).isInstanceOf(Exception.class);
    }
}
