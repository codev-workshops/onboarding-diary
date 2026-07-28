package com.workshop.onboardingdiary.repository;

import com.workshop.onboardingdiary.entity.ManagerAssignment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ManagerAssignmentRepository extends JpaRepository<ManagerAssignment, Long> {

    boolean existsByManagerIdAndRecruitId(Long managerId, Long recruitId);

    /** The recruit ids one manager oversees, the scope of the manager dashboard (REQUIREMENTS 10.2). */
    @Query("select ma.recruit.id from ManagerAssignment ma where ma.manager.id = :managerId")
    List<Long> findRecruitIdsByManagerId(@Param("managerId") Long managerId);
}
