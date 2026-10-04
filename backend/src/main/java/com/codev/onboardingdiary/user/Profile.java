package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

/** Personal and organisational details of a user (1:1 with {@link User}). */
@Entity
@Table(name = "profiles")
public class Profile extends AuditableEntity {

  @Id
  @Column(name = "user_id")
  private Long userId;

  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "full_name", nullable = false, length = 120)
  private String fullName;

  @Column(name = "job_title", length = 120)
  private String jobTitle;

  @Column(nullable = false, length = 120)
  private String department;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "manager_id")
  private User manager;

  @Column(length = 30)
  private String phone;

  protected Profile() {}

  public Profile(User user, ProfileDetails details) {
    this.user = user;
    update(details);
  }

  public void update(ProfileDetails details) {
    fullName = details.fullName();
    jobTitle = details.jobTitle();
    department = details.department();
    startDate = details.startDate();
  }

  public Long getUserId() {
    return userId;
  }

  public User getUser() {
    return user;
  }

  public String getFullName() {
    return fullName;
  }

  public String getJobTitle() {
    return jobTitle;
  }

  public String getDepartment() {
    return department;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public User getManager() {
    return manager;
  }

  public void setManager(User manager) {
    this.manager = manager;
  }

  public String getPhone() {
    return phone;
  }
}
