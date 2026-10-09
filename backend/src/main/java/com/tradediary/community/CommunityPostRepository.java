package com.tradediary.community;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {
    @EntityGraph(attributePaths = "user")
    Page<CommunityPost> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    @Query("select p from CommunityPost p where p.id = :id")
    Optional<CommunityPost> findWithUserById(Long id);
}
