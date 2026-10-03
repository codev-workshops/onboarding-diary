package com.codev.onboardingdiary.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfileRepository extends JpaRepository<Profile, Long> {

  @Query("select p.fullName from Profile p where p.userId = :userId")
  Optional<String> findFullNameByUserId(@Param("userId") Long userId);

  /** Builds the client view of a user, resolving the manager's display name. */
  default UserDto toUserDto(User user, Profile profile) {
    User manager = profile.getManager();
    String managerName =
        manager == null ? null : findFullNameByUserId(manager.getId()).orElse(null);
    return UserDto.from(user, profile, managerName);
  }
}
